#!/bin/bash
# ============================================================
# Teardown all AWS infrastructure for pw-e2e-fullstack
# Run this when you're done to avoid ongoing charges!
# ============================================================

# Do NOT use set -e — teardown must continue even if some deletes fail
AWS_REGION="us-east-1"
PROJECT="pw-e2e"

echo "WARNING: This will DELETE all AWS resources for ${PROJECT}!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# ─────────────────────────────────────────────
# Step 1: Delete ECS services
# ─────────────────────────────────────────────
echo "[1/9] Deleting ECS services..."
for ENV in qa prod; do
    for SVC in backend frontend; do
        SERVICE="${PROJECT}-${ENV}-${SVC}"
        echo "  Stopping $SERVICE..."
        aws ecs update-service --cluster ${PROJECT}-cluster --service $SERVICE --desired-count 0 --region $AWS_REGION 2>/dev/null || true
        aws ecs delete-service --cluster ${PROJECT}-cluster --service $SERVICE --force --region $AWS_REGION 2>/dev/null || true
    done
done
echo "  Waiting 30s for services to drain..."
sleep 30

# ─────────────────────────────────────────────
# Step 2: Deregister ECS task definitions
# ─────────────────────────────────────────────
echo "[2/9] Deregistering ECS task definitions..."
for ENV in qa prod; do
    for SVC in backend frontend; do
        FAMILY="${PROJECT}-${ENV}-${SVC}"
        # List all revisions of this task definition
        TASK_DEFS=$(aws ecs list-task-definitions --family-prefix $FAMILY --query 'taskDefinitionArns[]' --output text --region $AWS_REGION 2>/dev/null)
        for TD in $TASK_DEFS; do
            aws ecs deregister-task-definition --task-definition $TD --region $AWS_REGION > /dev/null 2>&1 || true
            echo "  Deregistered: $TD"
        done
        # Delete the inactive task definitions
        aws ecs delete-task-definitions --task-definitions $(echo $TASK_DEFS) --region $AWS_REGION > /dev/null 2>&1 || true
    done
done

# ─────────────────────────────────────────────
# Step 3: Delete ALBs, listeners, and target groups
# ─────────────────────────────────────────────
echo "[3/9] Deleting ALBs and target groups..."
for ENV in qa prod; do
    ALB_ARN=$(aws elbv2 describe-load-balancers --names "${PROJECT}-${ENV}-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$ALB_ARN" != "None" ] && [ -n "$ALB_ARN" ]; then
        # Delete listeners first (required before ALB can be deleted)
        LISTENERS=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[*].ListenerArn' --output text --region $AWS_REGION 2>/dev/null)
        for L in $LISTENERS; do
            aws elbv2 delete-listener --listener-arn $L --region $AWS_REGION 2>/dev/null || true
        done
        aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region $AWS_REGION 2>/dev/null || true
        echo "  Deleted ALB: ${PROJECT}-${ENV}-alb"
    fi
done
# Wait for ALBs to fully delete before removing target groups
echo "  Waiting 30s for ALBs to delete..."
sleep 30
for ENV in qa prod; do
    for TG_NAME in frontend-tg backend-tg; do
        TG_ARN=$(aws elbv2 describe-target-groups --names "${PROJECT}-${ENV}-${TG_NAME}" --query 'TargetGroups[0].TargetGroupArn' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$TG_ARN" != "None" ] && [ -n "$TG_ARN" ]; then
            aws elbv2 delete-target-group --target-group-arn $TG_ARN --region $AWS_REGION 2>/dev/null || true
            echo "  Deleted target group: ${PROJECT}-${ENV}-${TG_NAME}"
        fi
    done
done

# ─────────────────────────────────────────────
# Step 4: Delete ECS cluster
# ─────────────────────────────────────────────
echo "[4/9] Deleting ECS cluster..."
aws ecs delete-cluster --cluster ${PROJECT}-cluster --region $AWS_REGION 2>/dev/null || true

# ─────────────────────────────────────────────
# Step 5: Delete RDS instance
# ─────────────────────────────────────────────
echo "[5/9] Deleting RDS instance (takes 5-10 minutes)..."
aws rds delete-db-instance --db-instance-identifier ${PROJECT}-db --skip-final-snapshot --delete-automated-backups --region $AWS_REGION 2>/dev/null || true
echo "  Waiting for RDS deletion..."
aws rds wait db-instance-deleted --db-instance-identifier ${PROJECT}-db --region $AWS_REGION 2>/dev/null || true
aws rds delete-db-subnet-group --db-subnet-group-name ${PROJECT}-db-subnet --region $AWS_REGION 2>/dev/null || true
echo "  RDS deleted."

# ─────────────────────────────────────────────
# Step 6: Delete NAT Gateway and Elastic IP
# ─────────────────────────────────────────────
echo "[6/9] Deleting NAT Gateway and Elastic IP..."
# Find NAT gateway in any state (available, pending, deleting)
NAT_GW=$(aws ec2 describe-nat-gateways --filter "Name=tag:Name,Values=${PROJECT}-nat" --query 'NatGateways[?State!=`deleted`].NatGatewayId | [0]' --output text --region $AWS_REGION 2>/dev/null)
if [ "$NAT_GW" != "None" ] && [ -n "$NAT_GW" ]; then
    aws ec2 delete-nat-gateway --nat-gateway-id $NAT_GW --region $AWS_REGION 2>/dev/null || true
    echo "  Waiting for NAT Gateway deletion (up to 2 minutes)..."
    # Poll until deleted
    for i in $(seq 1 24); do
        STATE=$(aws ec2 describe-nat-gateways --nat-gateway-ids $NAT_GW --query 'NatGateways[0].State' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$STATE" = "deleted" ] || [ "$STATE" = "None" ]; then
            echo "  NAT Gateway deleted."
            break
        fi
        sleep 5
    done
fi

# Release Elastic IP (must wait until NAT Gateway is fully deleted)
EIP_ALLOC=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=${PROJECT}-nat-eip" --query 'Addresses[0].AllocationId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$EIP_ALLOC" != "None" ] && [ -n "$EIP_ALLOC" ]; then
    aws ec2 release-address --allocation-id $EIP_ALLOC --region $AWS_REGION 2>/dev/null || true
    echo "  Elastic IP released."
fi

# ─────────────────────────────────────────────
# Step 7: Delete security groups
# ─────────────────────────────────────────────
echo "[7/9] Deleting security groups..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${PROJECT}-vpc" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION 2>/dev/null)

if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
    # Delete in reverse dependency order: RDS SG first, then ECS SG, then ALB SG
    for SG_NAME in "${PROJECT}-rds-sg" "${PROJECT}-ecs-sg" "${PROJECT}-alb-sg"; do
        SG_ID=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=${SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
            # Remove all ingress/egress rules first to break circular dependencies
            aws ec2 revoke-security-group-ingress --group-id $SG_ID --ip-permissions "$(aws ec2 describe-security-groups --group-ids $SG_ID --query 'SecurityGroups[0].IpPermissions' --output json --region $AWS_REGION 2>/dev/null)" --region $AWS_REGION 2>/dev/null || true
            aws ec2 delete-security-group --group-id $SG_ID --region $AWS_REGION 2>/dev/null || true
            echo "  Deleted: $SG_NAME ($SG_ID)"
        fi
    done
fi

# ─────────────────────────────────────────────
# Step 8: Delete subnets, route tables, IGW, VPC
# ─────────────────────────────────────────────
echo "[8/9] Deleting networking (subnets, route tables, IGW, VPC)..."
if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
    # Delete route table associations and route tables
    for RT_NAME in "${PROJECT}-private-rt" "${PROJECT}-public-rt"; do
        RT_ID=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=${RT_NAME}" --query 'RouteTables[0].RouteTableId' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$RT_ID" != "None" ] && [ -n "$RT_ID" ]; then
            ASSOCS=$(aws ec2 describe-route-tables --route-table-ids $RT_ID --query 'RouteTables[0].Associations[?!Main].RouteTableAssociationId' --output text --region $AWS_REGION 2>/dev/null)
            for A in $ASSOCS; do
                aws ec2 disassociate-route-table --association-id $A --region $AWS_REGION 2>/dev/null || true
            done
            aws ec2 delete-route-table --route-table-id $RT_ID --region $AWS_REGION 2>/dev/null || true
            echo "  Deleted route table: $RT_NAME"
        fi
    done

    # Detach and delete Internet Gateway
    IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=${PROJECT}-igw" --query 'InternetGateways[0].InternetGatewayId' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$IGW_ID" != "None" ] && [ -n "$IGW_ID" ]; then
        aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION 2>/dev/null || true
        aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID --region $AWS_REGION 2>/dev/null || true
        echo "  Deleted Internet Gateway: $IGW_ID"
    fi

    # Delete subnets
    for SUB_NAME in "${PROJECT}-public-1" "${PROJECT}-public-2" "${PROJECT}-private-1" "${PROJECT}-private-2"; do
        SUB_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=${SUB_NAME}" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$SUB_ID" != "None" ] && [ -n "$SUB_ID" ]; then
            aws ec2 delete-subnet --subnet-id $SUB_ID --region $AWS_REGION 2>/dev/null || true
            echo "  Deleted subnet: $SUB_NAME"
        fi
    done

    # Delete VPC
    aws ec2 delete-vpc --vpc-id $VPC_ID --region $AWS_REGION 2>/dev/null || true
    echo "  Deleted VPC: $VPC_ID"
fi

# ─────────────────────────────────────────────
# Step 9: Delete ECR repos, IAM roles, and log groups
# ─────────────────────────────────────────────
echo "[9/9] Deleting ECR repos, IAM roles, and log groups..."

# ECR repositories (--force deletes all images inside)
for REPO in backend frontend; do
    aws ecr delete-repository --repository-name "${PROJECT}/${REPO}" --force --region $AWS_REGION 2>/dev/null || true
    echo "  Deleted ECR repo: ${PROJECT}/${REPO}"
done

# CloudWatch log groups
for ENV in qa prod; do
    for SVC in backend frontend; do
        aws logs delete-log-group --log-group-name "/ecs/${PROJECT}/${ENV}/${SVC}" --region $AWS_REGION 2>/dev/null || true
    done
done
echo "  Deleted CloudWatch log groups"

# IAM roles (must remove policies before deleting roles)
aws iam delete-role-policy --role-name ${PROJECT}-github-actions --policy-name deploy-policy 2>/dev/null || true
aws iam delete-role --role-name ${PROJECT}-github-actions 2>/dev/null || true
echo "  Deleted IAM role: ${PROJECT}-github-actions"

aws iam detach-role-policy --role-name ${PROJECT}-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true
aws iam delete-role --role-name ${PROJECT}-ecs-execution-role 2>/dev/null || true
echo "  Deleted IAM role: ${PROJECT}-ecs-execution-role"

aws iam delete-role --role-name ${PROJECT}-ecs-task-role 2>/dev/null || true
echo "  Deleted IAM role: ${PROJECT}-ecs-task-role"

echo ""
echo "============================================"
echo "  All resources deleted!"
echo "============================================"
echo ""
echo "Note: The GitHub OIDC provider was kept (it can be shared across projects)."
echo ""
echo "To verify nothing is left behind, check:"
echo "  - ECS:  https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}"
echo "  - EC2:  https://console.aws.amazon.com/ec2/home?region=${AWS_REGION} (check NAT Gateways, EIPs)"
echo "  - RDS:  https://console.aws.amazon.com/rds/home?region=${AWS_REGION}"
echo "  - VPC:  https://console.aws.amazon.com/vpc/home?region=${AWS_REGION}"
