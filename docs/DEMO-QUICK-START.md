# Demo Quick Start Guide

> How to bring the full CI/CD pipeline back up for interviews or demos,
> and tear it down after to save money.

---

## Teardown (Stop Paying)

Run this when you're done demonstrating:

```bash
cd /Users/theinzaw/pw-e2e-fullstack
./infra/teardown-aws.sh
```

This deletes **everything** on AWS. Takes about 10-15 minutes (mostly waiting
for RDS deletion). After this, your monthly cost is **$0**.

**What stays:** Your GitHub repo, code, workflows, secrets — all free. Only AWS
resources cost money.

---

## Bring It Back Up (Before a Demo)

Allow **20-30 minutes** before your demo to set everything up.

### Step 1: Verify AWS CLI is configured (30 seconds)

```bash
aws sts get-caller-identity
```

If this fails, run `aws configure` with your access key, secret key,
region `us-east-1`, and output `json`.

### Step 2: Run the infrastructure setup (15-20 minutes)

```bash
cd /Users/theinzaw/pw-e2e-fullstack
./infra/setup-aws.sh
```

This creates all AWS resources: VPC, subnets, RDS database, ECS cluster,
ALBs, security groups, IAM roles.

**Wait for it to finish completely.** It will print the URLs at the end.

### Step 3: Note the new URLs (1 minute)

The setup script prints something like:

```
QA URL:   http://pw-e2e-qa-alb-XXXXXXXXX.us-east-1.elb.amazonaws.com
Prod URL: http://pw-e2e-prod-alb-XXXXXXXXX.us-east-1.elb.amazonaws.com
GitHub Actions Role ARN: arn:aws:iam::067744549244:role/pw-e2e-github-actions
```

**Important:** The ALB URLs will be **different** each time you set up. Copy them.

### Step 4: Update GitHub Secrets (2 minutes)

Go to: https://github.com/thein-zaw-22/pw-e2e-fullstack/settings/secrets/actions

Update these secrets with the **new values** from Step 3:

| Secret | What to update |
|--------|---------------|
| `QA_URL` | New QA ALB URL from Step 3 |
| `PROD_URL` | New Prod ALB URL from Step 3 |
| `AWS_ROLE_ARN` | Usually stays the same, but check Step 3 output |
| `ECS_NETWORK_CONFIG` | New subnet and security group IDs (printed by script) |

> **Tip:** Click the pencil icon next to each secret to update the value.

### Step 5: Login to ECR and build Docker images (5 minutes)

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 067744549244.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend (must use linux/amd64 because ECS runs on Intel/AMD)
docker buildx build --platform linux/amd64 \
  -t 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/backend:latest \
  --push ./backend

# Build and push frontend
docker buildx build --platform linux/amd64 \
  -t 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/frontend:latest \
  --push ./frontend
```

### Step 6: Get the network config values (1 minute)

You need the private subnet IDs and ECS security group ID for the next step.
The setup script prints these, but if you missed them:

```bash
# Get private subnet IDs
aws ec2 describe-subnets --filters "Name=tag:Name,Values=pw-e2e-private-*" \
  --query 'Subnets[*].{Name:Tags[?Key==`Name`].Value|[0],Id:SubnetId}' \
  --output table --region us-east-1

# Get ECS security group ID
aws ec2 describe-security-groups --filters "Name=tag:Name,Values=pw-e2e-ecs-sg" \
  --query 'SecurityGroups[0].GroupId' --output text --region us-east-1
```

### Step 7: Run database migrations (2 minutes)

Replace `<PRIV_SUB1>`, `<PRIV_SUB2>`, and `<ECS_SG>` with values from Step 6:

```bash
aws ecs run-task \
  --cluster pw-e2e-cluster \
  --task-definition pw-e2e-qa-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<PRIV_SUB1>,<PRIV_SUB2>],securityGroups=[<ECS_SG>],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"backend","command":["sh","-c","python manage.py makemigrations users items --noinput && python manage.py migrate --noinput && python manage.py seed_data"]}]}' \
  --region us-east-1
```

Wait about 1 minute, then check it finished:

```bash
# Check the task finished successfully (should show "STOPPED" and exitCode 0)
aws ecs list-tasks --cluster pw-e2e-cluster --desired-status STOPPED \
  --query 'taskArns[0]' --output text --region us-east-1 | \
  xargs -I {} aws ecs describe-tasks --cluster pw-e2e-cluster --tasks {} \
  --query 'tasks[0].containers[0].exitCode' --output text --region us-east-1
```

`0` means success. If it says `1`, check the logs:

```bash
aws logs describe-log-streams --log-group-name '/ecs/pw-e2e/qa/backend' \
  --order-by LastEventTime --descending --limit 1 \
  --query 'logStreams[0].logStreamName' --output text --region us-east-1 | \
  xargs -I {} aws logs get-log-events --log-group-name '/ecs/pw-e2e/qa/backend' \
  --log-stream-name {} --limit 20 --query 'events[*].message' \
  --output json --region us-east-1
```

### Step 8: Force redeploy ECS services (3 minutes)

```bash
# Update services to use latest task definition and image
for ENV in qa prod; do
  for SVC in backend frontend; do
    aws ecs update-service \
      --cluster pw-e2e-cluster \
      --service pw-e2e-${ENV}-${SVC} \
      --force-new-deployment \
      --region us-east-1 \
      --query 'service.serviceName' --output text
  done
done

echo "Waiting for QA services to stabilize..."
aws ecs wait services-stable \
  --cluster pw-e2e-cluster \
  --services pw-e2e-qa-backend pw-e2e-qa-frontend \
  --region us-east-1

echo "QA is ready!"
```

### Step 9: Verify everything works (1 minute)

Replace `<QA_URL>` with the URL from Step 3:

```bash
QA_URL="http://<your-qa-alb-url>"

# Check frontend loads
curl -s -o /dev/null -w "Frontend: %{http_code}\n" $QA_URL/

# Check backend health
curl -s $QA_URL/api/health/

# Check login works
printf '{"email":"admin@example.com","password":"Admin123!"}' | \
  curl -s -X POST "$QA_URL/api/users/login/" \
  -H 'Content-Type: application/json' -d @-
```

You should see:
- Frontend: `200`
- Health: `{"status": "healthy"}`
- Login: a JSON response with a token

### Step 10: Trigger the CD pipeline (optional)

Push any small change to trigger the full pipeline:

```bash
git commit --allow-empty -m "Trigger CD pipeline for demo"
git push origin main
```

Then go to https://github.com/thein-zaw-22/pw-e2e-fullstack/actions to watch
it run. When it reaches the approval step, you approve it — this is the
live demo of your QA sign-off workflow.

---

## During the Demo — What to Show

### 1. Show the architecture (2 minutes)
- Open `docs/CICD-GUIDE.md` and show the pipeline flow diagram
- Explain: "CI runs tests, CD deploys to QA, I approve, then it goes to prod"

### 2. Show the live app (2 minutes)
- Open the QA URL in a browser
- Login with `admin@example.com` / `Admin123!`
- Show the dashboard, items, profile pages

### 3. Show the pipeline in action (5 minutes)
- Make a small code change (e.g., update the README)
- Push to GitHub
- Show the Actions tab — pipeline running
- Show the build, deploy, test stages
- Show the approval gate waiting for you
- Approve it and watch production deploy

### 4. Show the test results (2 minutes)
- Download the Playwright report artifact from the pipeline
- Open the HTML report showing all 47 tests passing

### 5. Show AWS infrastructure (2 minutes)
- Open AWS Console → ECS → show the cluster, services, running tasks
- Open CloudWatch → show the logs
- Open EC2 → Load Balancers → show the ALBs and path-based routing

---

## Troubleshooting

### "Services not stabilizing"
The containers might fail health checks. Check the logs:
```bash
aws logs describe-log-streams --log-group-name '/ecs/pw-e2e/qa/backend' \
  --order-by LastEventTime --descending --limit 1 \
  --query 'logStreams[0].logStreamName' --output text --region us-east-1 | \
  xargs -I {} aws logs get-log-events --log-group-name '/ecs/pw-e2e/qa/backend' \
  --log-stream-name {} --limit 20 --query 'events[*].message' \
  --output json --region us-east-1
```

### "Password authentication failed"
The RDS password must match what's in the task definition. Our password is
`PwE2ESecure2024` (no special characters). If the setup script uses a different
password, update the task definitions.

### "Host not found: backend"
The frontend container is using the wrong nginx config. Make sure the Docker
image was rebuilt with `nginx.conf.production` (not the local dev config).

### "exec format error"
You built the Docker image on Mac (ARM) but ECS needs AMD64. Rebuild with:
```bash
docker buildx build --platform linux/amd64 ...
```

---

## Cost Summary

| When | Monthly Cost |
|------|-------------|
| Infrastructure running | ~$30-50/month |
| After teardown | $0 |
| Each time you set up + tear down same day | ~$1-2 |

**Tip:** Set up in the morning before your interview, tear down right after.
You'll pay less than $2.
