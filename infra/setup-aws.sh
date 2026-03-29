#!/bin/bash
# ============================================================
# AWS Infrastructure Setup for pw-e2e-fullstack
# Creates: VPC, Subnets, ALB, ECS, RDS, ECR, IAM roles
# Run: chmod +x infra/setup-aws.sh && ./infra/setup-aws.sh
# ============================================================

set -e

# --- Configuration ---
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="067744549244"
PROJECT="pw-e2e"
DB_NAME="demo_app"
DB_USER="postgres"
DB_PASSWORD="PwE2E_Secure_2024!"  # Change this!

echo "========================================="
echo "Setting up AWS infrastructure for $PROJECT"
echo "Region: $AWS_REGION"
echo "========================================="

# --- 1. ECR Repositories ---
echo ""
echo "[1/10] Creating ECR repositories..."
for REPO in backend frontend; do
    aws ecr describe-repositories --repository-names "${PROJECT}/${REPO}" --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository \
        --repository-name "${PROJECT}/${REPO}" \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        --query 'repository.repositoryUri' --output text
    echo "  ✓ ECR repo: ${PROJECT}/${REPO}"
done

# --- 2. VPC ---
echo ""
echo "[2/10] Creating VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${PROJECT}-vpc" --query 'Vpcs[0].VpcId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block 10.0.0.0/16 \
        --query 'Vpc.VpcId' --output text \
        --region $AWS_REGION)
    aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=${PROJECT}-vpc --region $AWS_REGION
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support --region $AWS_REGION
    aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames --region $AWS_REGION
fi
echo "  ✓ VPC: $VPC_ID"

# --- 3. Subnets (2 public + 2 private) ---
echo ""
echo "[3/10] Creating subnets..."

# Public subnet 1 - us-east-1a
PUB_SUB1=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=${PROJECT}-public-1" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$PUB_SUB1" = "None" ] || [ -z "$PUB_SUB1" ]; then
    PUB_SUB1=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a --query 'Subnet.SubnetId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $PUB_SUB1 --tags Key=Name,Value=${PROJECT}-public-1 --region $AWS_REGION
fi

# Public subnet 2 - us-east-1b
PUB_SUB2=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=${PROJECT}-public-2" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$PUB_SUB2" = "None" ] || [ -z "$PUB_SUB2" ]; then
    PUB_SUB2=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${AWS_REGION}b --query 'Subnet.SubnetId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $PUB_SUB2 --tags Key=Name,Value=${PROJECT}-public-2 --region $AWS_REGION
fi

# Private subnet 1 - us-east-1a
PRIV_SUB1=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=${PROJECT}-private-1" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$PRIV_SUB1" = "None" ] || [ -z "$PRIV_SUB1" ]; then
    PRIV_SUB1=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.3.0/24 --availability-zone ${AWS_REGION}a --query 'Subnet.SubnetId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $PRIV_SUB1 --tags Key=Name,Value=${PROJECT}-private-1 --region $AWS_REGION
fi

# Private subnet 2 - us-east-1b
PRIV_SUB2=$(aws ec2 describe-subnets --filters "Name=tag:Name,Values=${PROJECT}-private-2" --query 'Subnets[0].SubnetId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$PRIV_SUB2" = "None" ] || [ -z "$PRIV_SUB2" ]; then
    PRIV_SUB2=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.4.0/24 --availability-zone ${AWS_REGION}b --query 'Subnet.SubnetId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $PRIV_SUB2 --tags Key=Name,Value=${PROJECT}-private-2 --region $AWS_REGION
fi
echo "  ✓ Public subnets: $PUB_SUB1, $PUB_SUB2"
echo "  ✓ Private subnets: $PRIV_SUB1, $PRIV_SUB2"

# --- 4. Internet Gateway + NAT Gateway ---
echo ""
echo "[4/10] Creating Internet Gateway and NAT Gateway..."

# Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=tag:Name,Values=${PROJECT}-igw" --query 'InternetGateways[0].InternetGatewayId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$IGW_ID" = "None" ] || [ -z "$IGW_ID" ]; then
    IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value=${PROJECT}-igw --region $AWS_REGION
    aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID --region $AWS_REGION
fi
echo "  ✓ Internet Gateway: $IGW_ID"

# Elastic IP for NAT Gateway
EIP_ALLOC=$(aws ec2 describe-addresses --filters "Name=tag:Name,Values=${PROJECT}-nat-eip" --query 'Addresses[0].AllocationId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$EIP_ALLOC" = "None" ] || [ -z "$EIP_ALLOC" ]; then
    EIP_ALLOC=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $EIP_ALLOC --tags Key=Name,Value=${PROJECT}-nat-eip --region $AWS_REGION
fi

# NAT Gateway in public subnet 1
NAT_GW=$(aws ec2 describe-nat-gateways --filter "Name=tag:Name,Values=${PROJECT}-nat" "Name=state,Values=available" --query 'NatGateways[0].NatGatewayId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$NAT_GW" = "None" ] || [ -z "$NAT_GW" ]; then
    NAT_GW=$(aws ec2 create-nat-gateway --subnet-id $PUB_SUB1 --allocation-id $EIP_ALLOC --query 'NatGateway.NatGatewayId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $NAT_GW --tags Key=Name,Value=${PROJECT}-nat --region $AWS_REGION
    echo "  Waiting for NAT Gateway to become available..."
    aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW --region $AWS_REGION
fi
echo "  ✓ NAT Gateway: $NAT_GW"

# --- 5. Route Tables ---
echo ""
echo "[5/10] Setting up route tables..."

# Public route table
PUB_RT=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=${PROJECT}-public-rt" --query 'RouteTables[0].RouteTableId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$PUB_RT" = "None" ] || [ -z "$PUB_RT" ]; then
    PUB_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $PUB_RT --tags Key=Name,Value=${PROJECT}-public-rt --region $AWS_REGION
    aws ec2 create-route --route-table-id $PUB_RT --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID --region $AWS_REGION
    aws ec2 associate-route-table --route-table-id $PUB_RT --subnet-id $PUB_SUB1 --region $AWS_REGION
    aws ec2 associate-route-table --route-table-id $PUB_RT --subnet-id $PUB_SUB2 --region $AWS_REGION
fi

# Private route table
PRIV_RT=$(aws ec2 describe-route-tables --filters "Name=tag:Name,Values=${PROJECT}-private-rt" --query 'RouteTables[0].RouteTableId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$PRIV_RT" = "None" ] || [ -z "$PRIV_RT" ]; then
    PRIV_RT=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $PRIV_RT --tags Key=Name,Value=${PROJECT}-private-rt --region $AWS_REGION
    aws ec2 create-route --route-table-id $PRIV_RT --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $NAT_GW --region $AWS_REGION
    aws ec2 associate-route-table --route-table-id $PRIV_RT --subnet-id $PRIV_SUB1 --region $AWS_REGION
    aws ec2 associate-route-table --route-table-id $PRIV_RT --subnet-id $PRIV_SUB2 --region $AWS_REGION
fi
echo "  ✓ Public route table: $PUB_RT"
echo "  ✓ Private route table: $PRIV_RT"

# --- 6. Security Groups ---
echo ""
echo "[6/10] Creating security groups..."

# ALB security group
ALB_SG=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=${PROJECT}-alb-sg" "Name=vpc-id,Values=${VPC_ID}" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$ALB_SG" = "None" ] || [ -z "$ALB_SG" ]; then
    ALB_SG=$(aws ec2 create-security-group --group-name "${PROJECT}-alb-sg" --description "ALB security group" --vpc-id $VPC_ID --query 'GroupId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $ALB_SG --tags Key=Name,Value=${PROJECT}-alb-sg --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $AWS_REGION
fi

# ECS security group
ECS_SG=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=${PROJECT}-ecs-sg" "Name=vpc-id,Values=${VPC_ID}" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$ECS_SG" = "None" ] || [ -z "$ECS_SG" ]; then
    ECS_SG=$(aws ec2 create-security-group --group-name "${PROJECT}-ecs-sg" --description "ECS tasks security group" --vpc-id $VPC_ID --query 'GroupId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $ECS_SG --tags Key=Name,Value=${PROJECT}-ecs-sg --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 80 --source-group $ALB_SG --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 8000 --source-group $ALB_SG --region $AWS_REGION
fi

# RDS security group
RDS_SG=$(aws ec2 describe-security-groups --filters "Name=tag:Name,Values=${PROJECT}-rds-sg" "Name=vpc-id,Values=${VPC_ID}" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION 2>/dev/null)
if [ "$RDS_SG" = "None" ] || [ -z "$RDS_SG" ]; then
    RDS_SG=$(aws ec2 create-security-group --group-name "${PROJECT}-rds-sg" --description "RDS security group" --vpc-id $VPC_ID --query 'GroupId' --output text --region $AWS_REGION)
    aws ec2 create-tags --resources $RDS_SG --tags Key=Name,Value=${PROJECT}-rds-sg --region $AWS_REGION
    aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $ECS_SG --region $AWS_REGION
fi
echo "  ✓ ALB SG: $ALB_SG"
echo "  ✓ ECS SG: $ECS_SG"
echo "  ✓ RDS SG: $RDS_SG"

# --- 7. RDS PostgreSQL ---
echo ""
echo "[7/10] Creating RDS PostgreSQL instance..."

# DB Subnet Group
aws rds describe-db-subnet-groups --db-subnet-group-name ${PROJECT}-db-subnet --region $AWS_REGION 2>/dev/null || \
aws rds create-db-subnet-group \
    --db-subnet-group-name ${PROJECT}-db-subnet \
    --db-subnet-group-description "DB subnet group for ${PROJECT}" \
    --subnet-ids $PRIV_SUB1 $PRIV_SUB2 \
    --region $AWS_REGION > /dev/null

# RDS instance (shared for QA and Prod — separate DBs inside)
RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier ${PROJECT}-db --query 'DBInstances[0].DBInstanceStatus' --output text --region $AWS_REGION 2>/dev/null)
if [ "$RDS_STATUS" = "None" ] || [ -z "$RDS_STATUS" ]; then
    aws rds create-db-instance \
        --db-instance-identifier ${PROJECT}-db \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version "16.9" \
        --master-username $DB_USER \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --db-name ${DB_NAME} \
        --vpc-security-group-ids $RDS_SG \
        --db-subnet-group-name ${PROJECT}-db-subnet \
        --no-publicly-accessible \
        --backup-retention-period 7 \
        --region $AWS_REGION > /dev/null
    echo "  Waiting for RDS to become available (this takes 5-10 minutes)..."
    aws rds wait db-instance-available --db-instance-identifier ${PROJECT}-db --region $AWS_REGION
fi

RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier ${PROJECT}-db --query 'DBInstances[0].Endpoint.Address' --output text --region $AWS_REGION)
echo "  ✓ RDS Endpoint: $RDS_ENDPOINT"

# --- 8. ECS Cluster + CloudWatch Log Groups ---
echo ""
echo "[8/10] Creating ECS cluster and log groups..."

aws ecs describe-clusters --clusters ${PROJECT}-cluster --query 'clusters[0].status' --output text --region $AWS_REGION 2>/dev/null | grep -q ACTIVE || \
aws ecs create-cluster --cluster-name ${PROJECT}-cluster --region $AWS_REGION > /dev/null
echo "  ✓ ECS Cluster: ${PROJECT}-cluster"

# Log groups
for ENV in qa prod; do
    for SVC in backend frontend; do
        aws logs describe-log-groups --log-group-name-prefix "/ecs/${PROJECT}/${ENV}/${SVC}" --region $AWS_REGION --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "/ecs/" || \
        aws logs create-log-group --log-group-name "/ecs/${PROJECT}/${ENV}/${SVC}" --region $AWS_REGION 2>/dev/null || true
    done
done
echo "  ✓ CloudWatch log groups created"

# --- 9. IAM Roles ---
echo ""
echo "[9/10] Creating IAM roles..."

# ECS Task Execution Role
EXEC_ROLE_ARN=$(aws iam get-role --role-name ${PROJECT}-ecs-execution-role --query 'Role.Arn' --output text 2>/dev/null || true)
if [ -z "$EXEC_ROLE_ARN" ]; then
    EXEC_ROLE_ARN=$(aws iam create-role \
        --role-name ${PROJECT}-ecs-execution-role \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }' \
        --query 'Role.Arn' --output text)
    aws iam attach-role-policy --role-name ${PROJECT}-ecs-execution-role \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
fi
echo "  ✓ ECS Execution Role: $EXEC_ROLE_ARN"

# ECS Task Role (minimal)
TASK_ROLE_ARN=$(aws iam get-role --role-name ${PROJECT}-ecs-task-role --query 'Role.Arn' --output text 2>/dev/null || true)
if [ -z "$TASK_ROLE_ARN" ]; then
    TASK_ROLE_ARN=$(aws iam create-role \
        --role-name ${PROJECT}-ecs-task-role \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }' \
        --query 'Role.Arn' --output text)
fi
echo "  ✓ ECS Task Role: $TASK_ROLE_ARN"

# GitHub Actions OIDC Provider
OIDC_ARN=$(aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?ends_with(Arn, 'token.actions.githubusercontent.com')].Arn | [0]" --output text 2>/dev/null)
if [ "$OIDC_ARN" = "None" ] || [ -z "$OIDC_ARN" ]; then
    OIDC_ARN=$(aws iam create-open-id-connect-provider \
        --url https://token.actions.githubusercontent.com \
        --client-id-list sts.amazonaws.com \
        --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
        --query 'OpenIDConnectProviderArn' --output text)
fi
echo "  ✓ GitHub OIDC Provider: $OIDC_ARN"

# GitHub Actions Role
GH_ROLE_ARN=$(aws iam get-role --role-name ${PROJECT}-github-actions --query 'Role.Arn' --output text 2>/dev/null || true)
if [ -z "$GH_ROLE_ARN" ]; then
    GH_ROLE_ARN=$(aws iam create-role \
        --role-name ${PROJECT}-github-actions \
        --assume-role-policy-document "{
            \"Version\": \"2012-10-17\",
            \"Statement\": [{
                \"Effect\": \"Allow\",
                \"Principal\": {\"Federated\": \"${OIDC_ARN}\"},
                \"Action\": \"sts:AssumeRoleWithWebIdentity\",
                \"Condition\": {
                    \"StringEquals\": {
                        \"token.actions.githubusercontent.com:aud\": \"sts.amazonaws.com\"
                    },
                    \"StringLike\": {
                        \"token.actions.githubusercontent.com:sub\": \"repo:thein-zaw-22/pw-e2e-fullstack:*\"
                    }
                }
            }]
        }" \
        --query 'Role.Arn' --output text)

    # Attach permissions for ECR, ECS, and IAM PassRole
    aws iam put-role-policy --role-name ${PROJECT}-github-actions \
        --policy-name deploy-policy \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "ecr:GetAuthorizationToken",
                        "ecr:BatchCheckLayerAvailability",
                        "ecr:GetDownloadUrlForLayer",
                        "ecr:BatchGetImage",
                        "ecr:PutImage",
                        "ecr:InitiateLayerUpload",
                        "ecr:UploadLayerPart",
                        "ecr:CompleteLayerUpload"
                    ],
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "ecs:UpdateService",
                        "ecs:DescribeServices",
                        "ecs:DescribeTaskDefinition",
                        "ecs:RegisterTaskDefinition",
                        "ecs:RunTask",
                        "ecs:DescribeTasks",
                        "ecs:ListTasks"
                    ],
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": "iam:PassRole",
                    "Resource": "*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "logs:CreateLogStream",
                        "logs:PutLogEvents"
                    ],
                    "Resource": "*"
                }
            ]
        }'
fi
echo "  ✓ GitHub Actions Role: $GH_ROLE_ARN"

# --- 10. ALB + Target Groups + ECS Services ---
echo ""
echo "[10/10] Creating ALB, target groups, and ECS services..."

for ENV in qa prod; do
    echo ""
    echo "  --- Setting up ${ENV} environment ---"

    # ALB
    ALB_ARN=$(aws elbv2 describe-load-balancers --names "${PROJECT}-${ENV}-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$ALB_ARN" = "None" ] || [ -z "$ALB_ARN" ]; then
        ALB_ARN=$(aws elbv2 create-load-balancer \
            --name "${PROJECT}-${ENV}-alb" \
            --subnets $PUB_SUB1 $PUB_SUB2 \
            --security-groups $ALB_SG \
            --scheme internet-facing \
            --type application \
            --query 'LoadBalancers[0].LoadBalancerArn' --output text \
            --region $AWS_REGION)
    fi
    ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].DNSName' --output text --region $AWS_REGION)
    echo "  ✓ ALB (${ENV}): $ALB_DNS"

    # Frontend target group
    FE_TG=$(aws elbv2 describe-target-groups --names "${PROJECT}-${ENV}-frontend-tg" --query 'TargetGroups[0].TargetGroupArn' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$FE_TG" = "None" ] || [ -z "$FE_TG" ]; then
        FE_TG=$(aws elbv2 create-target-group \
            --name "${PROJECT}-${ENV}-frontend-tg" \
            --protocol HTTP --port 80 \
            --vpc-id $VPC_ID \
            --target-type ip \
            --health-check-path "/" \
            --health-check-interval-seconds 30 \
            --healthy-threshold-count 2 \
            --query 'TargetGroups[0].TargetGroupArn' --output text \
            --region $AWS_REGION)
    fi

    # Backend target group
    BE_TG=$(aws elbv2 describe-target-groups --names "${PROJECT}-${ENV}-backend-tg" --query 'TargetGroups[0].TargetGroupArn' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$BE_TG" = "None" ] || [ -z "$BE_TG" ]; then
        BE_TG=$(aws elbv2 create-target-group \
            --name "${PROJECT}-${ENV}-backend-tg" \
            --protocol HTTP --port 8000 \
            --vpc-id $VPC_ID \
            --target-type ip \
            --health-check-path "/api/health/" \
            --health-check-interval-seconds 30 \
            --healthy-threshold-count 2 \
            --query 'TargetGroups[0].TargetGroupArn' --output text \
            --region $AWS_REGION)
    fi

    # Listener with rules: /api/* and /media/* → backend, default → frontend
    LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[0].ListenerArn' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$LISTENER_ARN" = "None" ] || [ -z "$LISTENER_ARN" ]; then
        LISTENER_ARN=$(aws elbv2 create-listener \
            --load-balancer-arn $ALB_ARN \
            --protocol HTTP --port 80 \
            --default-actions Type=forward,TargetGroupArn=$FE_TG \
            --query 'Listeners[0].ListenerArn' --output text \
            --region $AWS_REGION)

        # Route /api/* to backend
        aws elbv2 create-rule \
            --listener-arn $LISTENER_ARN \
            --priority 10 \
            --conditions Field=path-pattern,Values='/api/*' \
            --actions Type=forward,TargetGroupArn=$BE_TG \
            --region $AWS_REGION > /dev/null

        # Route /media/* to backend
        aws elbv2 create-rule \
            --listener-arn $LISTENER_ARN \
            --priority 20 \
            --conditions Field=path-pattern,Values='/media/*' \
            --actions Type=forward,TargetGroupArn=$BE_TG \
            --region $AWS_REGION > /dev/null
    fi
    echo "  ✓ Listener with path-based routing configured"

    # Register task definitions
    ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

    # Backend task definition
    aws ecs register-task-definition \
        --family "${PROJECT}-${ENV}-backend" \
        --network-mode awsvpc \
        --requires-compatibilities FARGATE \
        --cpu "256" --memory "512" \
        --execution-role-arn "$EXEC_ROLE_ARN" \
        --task-role-arn "$TASK_ROLE_ARN" \
        --container-definitions "[{
            \"name\": \"backend\",
            \"image\": \"${ECR_BASE}/${PROJECT}/backend:latest\",
            \"portMappings\": [{\"containerPort\": 8000, \"protocol\": \"tcp\"}],
            \"environment\": [
                {\"name\": \"SECRET_KEY\", \"value\": \"${ENV}-secret-key-change-me-in-production\"},
                {\"name\": \"DEBUG\", \"value\": \"false\"},
                {\"name\": \"DB_HOST\", \"value\": \"${RDS_ENDPOINT}\"},
                {\"name\": \"DB_PORT\", \"value\": \"5432\"},
                {\"name\": \"DB_NAME\", \"value\": \"${DB_NAME}\"},
                {\"name\": \"DB_USER\", \"value\": \"${DB_USER}\"},
                {\"name\": \"DB_PASSWORD\", \"value\": \"${DB_PASSWORD}\"},
                {\"name\": \"ALLOWED_HOSTS\", \"value\": \"*\"},
                {\"name\": \"CORS_ALLOWED_ORIGINS\", \"value\": \"http://${ALB_DNS}\"}
            ],
            \"logConfiguration\": {
                \"logDriver\": \"awslogs\",
                \"options\": {
                    \"awslogs-group\": \"/ecs/${PROJECT}/${ENV}/backend\",
                    \"awslogs-region\": \"${AWS_REGION}\",
                    \"awslogs-stream-prefix\": \"ecs\"
                }
            },
            \"essential\": true
        }]" --region $AWS_REGION > /dev/null
    echo "  ✓ Backend task definition registered"

    # Frontend task definition (no proxy needed — ALB handles routing)
    aws ecs register-task-definition \
        --family "${PROJECT}-${ENV}-frontend" \
        --network-mode awsvpc \
        --requires-compatibilities FARGATE \
        --cpu "256" --memory "512" \
        --execution-role-arn "$EXEC_ROLE_ARN" \
        --task-role-arn "$TASK_ROLE_ARN" \
        --container-definitions "[{
            \"name\": \"frontend\",
            \"image\": \"${ECR_BASE}/${PROJECT}/frontend:latest\",
            \"portMappings\": [{\"containerPort\": 80, \"protocol\": \"tcp\"}],
            \"logConfiguration\": {
                \"logDriver\": \"awslogs\",
                \"options\": {
                    \"awslogs-group\": \"/ecs/${PROJECT}/${ENV}/frontend\",
                    \"awslogs-region\": \"${AWS_REGION}\",
                    \"awslogs-stream-prefix\": \"ecs\"
                }
            },
            \"essential\": true
        }]" --region $AWS_REGION > /dev/null
    echo "  ✓ Frontend task definition registered"

    # Create ECS services
    BE_SVC_STATUS=$(aws ecs describe-services --cluster ${PROJECT}-cluster --services ${PROJECT}-${ENV}-backend --query 'services[0].status' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$BE_SVC_STATUS" != "ACTIVE" ]; then
        aws ecs create-service \
            --cluster ${PROJECT}-cluster \
            --service-name ${PROJECT}-${ENV}-backend \
            --task-definition ${PROJECT}-${ENV}-backend \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$PRIV_SUB1,$PRIV_SUB2],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
            --load-balancers "targetGroupArn=$BE_TG,containerName=backend,containerPort=8000" \
            --region $AWS_REGION > /dev/null 2>&1 || true
    fi
    echo "  ✓ Backend ECS service created"

    FE_SVC_STATUS=$(aws ecs describe-services --cluster ${PROJECT}-cluster --services ${PROJECT}-${ENV}-frontend --query 'services[0].status' --output text --region $AWS_REGION 2>/dev/null)
    if [ "$FE_SVC_STATUS" != "ACTIVE" ]; then
        aws ecs create-service \
            --cluster ${PROJECT}-cluster \
            --service-name ${PROJECT}-${ENV}-frontend \
            --task-definition ${PROJECT}-${ENV}-frontend \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$PRIV_SUB1,$PRIV_SUB2],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
            --load-balancers "targetGroupArn=$FE_TG,containerName=frontend,containerPort=80" \
            --region $AWS_REGION > /dev/null 2>&1 || true
    fi
    echo "  ✓ Frontend ECS service created"
done

# --- Summary ---
echo ""
echo "========================================="
echo "✅ Infrastructure setup complete!"
echo "========================================="
echo ""
echo "Resources created:"
echo "  VPC:           $VPC_ID"
echo "  ECS Cluster:   ${PROJECT}-cluster"
echo "  RDS Endpoint:  $RDS_ENDPOINT"
echo ""

QA_ALB_DNS=$(aws elbv2 describe-load-balancers --names "${PROJECT}-qa-alb" --query 'LoadBalancers[0].DNSName' --output text --region $AWS_REGION)
PROD_ALB_DNS=$(aws elbv2 describe-load-balancers --names "${PROJECT}-prod-alb" --query 'LoadBalancers[0].DNSName' --output text --region $AWS_REGION)

echo "  QA URL:        http://$QA_ALB_DNS"
echo "  Prod URL:      http://$PROD_ALB_DNS"
echo ""
echo "GitHub Actions Role ARN: $GH_ROLE_ARN"
echo ""
echo "Next steps:"
echo "  1. Add GitHub secrets (see README)"
echo "  2. Build and push initial Docker images"
echo "  3. Run DB migrations via ECS run-task"
echo "  4. Push to main to trigger CD pipeline"
