#!/bin/bash
# ============================================================
# Teardown all AWS infrastructure for pw-e2e-fullstack
# Run this when you're done to avoid ongoing charges!
# ============================================================

set -e
AWS_REGION="us-east-1"
PROJECT="pw-e2e"

echo "⚠️  This will DELETE all AWS resources for ${PROJECT}!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "[1/8] Deleting ECS services..."
for ENV in qa prod; do
    for SVC in backend frontend; do
        aws ecs update-service --cluster ${PROJECT}-cluster --service ${PROJECT}-${ENV}-${SVC} --desired-count 0 --region $AWS_REGION 2>/dev/null || true
        aws ecs delete-service --cluster ${PROJECT}-cluster --service ${PROJECT}-${ENV}-${SVC} --force --region $AWS_REGION 2>/dev/null || true
    done
done

echo "[2/8] Deleting ALBs and target groups..."
for ENV in qa prod; do
    ALB_ARN=$(aws elbv2 describe-load-balancers --names "${PROJECT}-${ENV}-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$ALB_ARN" != "None" ] && [ -n "$ALB_ARN" ]; then
        # Delete listeners first
        LISTENERS=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[*].ListenerArn' --output text --region $AWS_REGION 2>/dev/null)
        for L in $LISTENERS; do aws elbv2 delete-listener --listener-arn $L --region $AWS_REGION 2>/dev/null || true; done
        aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN --region $AWS_REGION 2>/dev/null || true
    fi
    for TG_NAME in frontend-tg backend-tg; do
        TG_ARN=$(aws elbv2 describe-target-groups --names "${PROJECT}-${ENV}-${TG_NAME}" --query 'TargetGroups[0].TargetGroupArn' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$TG_ARN" != "None" ] && [ -n "$TG_ARN" ]; then
            aws elbv2 delete-target-group --target-group-arn $TG_ARN --region $AWS_REGION 2>/dev/null || true
        fi
    done
done

echo "[3/8] Deleting ECS cluster..."
aws ecs delete-cluster --cluster ${PROJECT}-cluster --region $AWS_REGION 2>/dev/null || true

echo "[4/8] Deleting RDS instance (takes a few minutes)..."
aws rds delete-db-instance --db-instance-identifier ${PROJECT}-db --skip-final-snapshot --region $AWS_REGION 2>/dev/null || true
echo "  Waiting for RDS deletion..."
aws rds wait db-instance-deleted --db-instance-identifier ${PROJECT}-db --region $AWS_REGION 2>/dev/null || true
aws rds delete-db-subnet-group --db-subnet-group-name ${PROJECT}-db-subnet --region $AWS_REGION 2>/dev/null || true

echo "[5/8] Deleting NAT Gateway and Elastic IP..."
NAT_GW=$(aws ec2 describe-nat-gateways --filter "Name=tag:Name,Values=${PROJECT}-nat" "Name=state,Values=available" --query 'NatGateways[0].NatGatewayId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$NAT_GW" != "None" ] && [ -n "$NAT_GW" ]; then
    aws ec2 delete-nat-gateway --nat-gateway-id $NAT_GW --region $AWS_REGION
    echo "  Waiting for NAT Gateway deletion..."
    sleep 60
fi
EIP_ALLOC=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=${PROJECT}-nat-eip" --query 'Addresses[0].AllocationId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$EIP_ALLOC" != "None" ] && [ -n "$EIP_ALLOC" ]; then
    aws ec2 release-address --allocation-id $EIP_ALLOC --region $AWS_REGION 2>/dev/null || true
fi

echo "[6/8] Deleting security groups..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${PROJECT}-vpc" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION 2>/dev/null)
for SG_NAME in "${PROJECT}-rds-sg" "${PROJECT}-ecs-sg" "${PROJECT}-alb-sg"; do
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=${SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
        aws ec2 delete-security-group --group-id $SG_ID --region $AWS_REGION 2>/dev/null || true
    fi
done

echo "[7/8] Deleting subnets, route tables, IGW, VPC..."
if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
    # Delete route table associations and route tables
    for RT_NAME in "${PROJECT}-private-rt" "${PROJECT}-public-rt"; do
        RT_ID=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=${RT_NAME}" --query 'RouteTables[0].RouteTableId' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$RT_ID" != "None" ] && [ -n "$RT_ID" ]; then
            ASSOCS=$(aws ec2 describe-route-tables --route-table-ids $RT_ID --query 'RouteTables[0].Associations[?!Main].RouteTableAssociationId' --output text --region $AWS_REGION 2>/dev/null)
            for A in $ASSOCS; do aws ec2 disassociate-route-table --association-id $A --region $AWS_REGION 2>/dev/null || true; done
            aws ec2 delete-route-table --route-table-id $RT_ID --region $AWS_REGION 2>/dev/null || true
        fi
    done
    # Detach and delete IGW
    IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=${PROJECT}-igw" --query 'InternetGateways[0].InternetGatewayId' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$IGW_ID" != "None" ] && [ -n "$IGW_ID" ]; then
        aws ec2 detach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION 2>/dev/null || true
        aws ec2 delete-internet-gateway --internet-gateway-id $IGW_ID --region $AWS_REGION 2>/dev/null || true
    fi
    # Delete subnets
    for SUB_NAME in "${PROJECT}-public-1" "${PROJECT}-public-2" "${PROJECT}-private-1" "${PROJECT}-private-2"; do
        SUB_ID=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=${SUB_NAME}" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION 2>/dev/null)
        if [ "$SUB_ID" != "None" ] && [ -n "$SUB_ID" ]; then
            aws ec2 delete-subnet --subnet-id $SUB_ID --region $AWS_REGION 2>/dev/null || true
        fi
    done
    # Delete VPC
    aws ec2 delete-vpc --vpc-id $VPC_ID --region $AWS_REGION 2>/dev/null || true
fi

echo "[8/8] Deleting ECR repos, IAM roles, and log groups..."
for REPO in backend frontend; do
    aws ecr delete-repository --repository-name "${PROJECT}/${REPO}" --force --region $AWS_REGION 2>/dev/null || true
done
for ENV in qa prod; do
    for SVC in backend frontend; do
        aws logs delete-log-group --log-group-name "/ecs/${PROJECT}/${ENV}/${SVC}" --region $AWS_REGION 2>/dev/null || true
    done
done
# IAM cleanup
aws iam delete-role-policy --role-name ${PROJECT}-github-actions --policy-name deploy-policy 2>/dev/null || true
aws iam delete-role --role-name ${PROJECT}-github-actions 2>/dev/null || true
aws iam detach-role-policy --role-name ${PROJECT}-ecs-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || true
aws iam delete-role --role-name ${PROJECT}-ecs-execution-role 2>/dev/null || true
aws iam delete-role --role-name ${PROJECT}-ecs-task-role 2>/dev/null || true

echo ""
echo "✅ All resources deleted!"
echo "Note: OIDC provider was kept (shared across projects)."
