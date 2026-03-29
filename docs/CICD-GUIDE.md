# CI/CD Guide for pw-e2e-fullstack

> A beginner-friendly, comprehensive guide to everything we built for Continuous
> Integration and Continuous Deployment in this project. If you have never used
> AWS, GitHub Actions, or Docker before, start at Part 1 and read in order.

---

## Table of Contents

- [Part 1: Understanding CI/CD (Theory)](#part-1-understanding-cicd-theory)
- [Part 2: Understanding the Tools](#part-2-understanding-the-tools)
- [Part 3: Our CI Pipeline (playwright.yml) - Line by Line](#part-3-our-ci-pipeline-playwrightyml---line-by-line)
- [Part 4: Our CD Pipeline (cd.yml) - Line by Line](#part-4-our-cd-pipeline-cdyml---line-by-line)
- [Part 5: AWS Infrastructure - What We Built](#part-5-aws-infrastructure---what-we-built)
- [Part 6: The Setup Process (Step by Step)](#part-6-the-setup-process-step-by-step)
- [Part 7: How Deployments Work](#part-7-how-deployments-work)
- [Part 8: Docker Configuration](#part-8-docker-configuration)
- [Part 9: Problems We Solved](#part-9-problems-we-solved)
- [Part 10: QA Engineer's Daily Workflow](#part-10-qa-engineers-daily-workflow)
- [Part 11: Cost and Cleanup](#part-11-cost-and-cleanup)
- [Part 12: Glossary](#part-12-glossary)
- [Part 13: Quick Reference](#part-13-quick-reference)

---

## Part 1: Understanding CI/CD (Theory)

### What is CI? What is CD?

**CI stands for Continuous Integration.** It means that every time a developer
pushes code, an automated system checks that the new code does not break
anything. It runs the tests, verifies the build, and tells the team whether the
code is safe.

**CD stands for Continuous Deployment (or Continuous Delivery).** It means that
once the code passes all tests, it is automatically deployed to servers where
users can access it. The difference between Delivery and Deployment is small:

- **Continuous Delivery** = code is automatically prepared for release, but a
  human presses the final "go" button.
- **Continuous Deployment** = code goes all the way to production automatically,
  with no human button press.

Our project uses a mix: we deploy to QA automatically, but a human (the QA
Engineer) must approve before the code reaches production. So we use Continuous
Delivery for production and Continuous Deployment for QA.

### What happens WITHOUT CI/CD?

1. Developer writes code on their laptop.
2. Developer says "it works on my machine" and sends it to the team.
3. Someone manually copies files to the server using FTP or SSH.
4. Nobody runs the full test suite because it takes too long.
5. The production server breaks at 2 AM on a Friday.
6. Everyone panics.

### What happens WITH CI/CD?

1. Developer pushes code to GitHub.
2. GitHub Actions automatically builds the app and runs all tests.
3. If tests pass, the app is automatically deployed to the QA environment.
4. The full end-to-end test suite runs against QA.
5. QA Engineer reviews the results and approves or rejects.
6. If approved, the same tested code deploys to production.
7. Smoke tests verify production is healthy.
8. Everyone sleeps well.

### The Full Pipeline Flow

```
 Developer pushes code to "main" branch
          |
          v
 +---------------------+
 | Job 1: BUILD & PUSH |  Build Docker images, push to AWS ECR
 +---------------------+
          |
          v
 +---------------------+
 | Job 2: DEPLOY TO QA |  Update ECS services in QA environment
 +---------------------+
          |
          v
 +---------------------+
 | Job 3: E2E TESTS    |  Run Playwright tests against live QA
 +---------------------+
          |
          v
 +---------------------+
 | Job 4: APPROVAL     |  QA Engineer reviews and approves
 +---------------------+   (Manual gate -- pipeline pauses here)
          |
          v
 +---------------------+
 | Job 5: DEPLOY PROD  |  Update ECS services in Production
 +---------------------+
          |
          v
 +---------------------+
 | Job 6: SMOKE TESTS  |  Quick sanity tests on Production
 +---------------------+
          |
          v
       DONE!
```

### Who Does What?

| Role          | Responsibility                                                  |
|---------------|-----------------------------------------------------------------|
| **Developer** | Writes code, pushes to GitHub, fixes failing tests              |
| **QA Engineer** | Reviews test results, approves or rejects production deploys  |
| **DevOps**    | Sets up AWS infrastructure, maintains pipelines, monitors costs |

In a small team, one person may wear multiple hats. That is fine. The important
thing is that the pipeline enforces quality gates regardless of team size.

---

## Part 2: Understanding the Tools

### What is GitHub Actions?

GitHub Actions is a service built into GitHub that runs code automatically when
certain events happen in your repository. Think of it as a robot that watches
your repository and performs tasks for you.

Key concepts:

- **Workflow**: A file (written in YAML) that describes what the robot should
  do. It lives in `.github/workflows/` in your repository.
- **Trigger**: The event that starts the workflow. For example: "when someone
  pushes to the main branch" or "when someone opens a pull request."
- **Job**: A group of steps that run on the same machine. A workflow can have
  multiple jobs.
- **Step**: A single task within a job. For example: "checkout the code" or
  "run the tests."
- **Runner**: The virtual machine where the job runs. We use `ubuntu-latest`,
  which means GitHub gives us a fresh Ubuntu Linux machine for every run.
- **Artifact**: A file produced by the workflow that you can download later.
  We use this to save test reports.
- **Secret**: A value stored securely in GitHub that your workflow can read
  but humans cannot see in logs. We store AWS credentials and URLs here.
- **Environment**: A named target (like "qa" or "production") that can have
  its own secrets and approval rules.

### What is AWS?

AWS (Amazon Web Services) is a cloud platform that lets you rent computers,
databases, networks, and many other services on-demand. Instead of buying a
physical server and putting it in your office, you tell AWS "give me a server"
and it appears in seconds. You pay only for what you use.

Here is every AWS service we use in this project and what it does:

#### VPC (Virtual Private Cloud)

A VPC is your own private network inside AWS. Think of it as your office
building. Nothing outside can get in unless you open a door. Our VPC has the
IP range `10.0.0.0/16`, which gives us 65,536 possible IP addresses.

**Our VPC**: `vpc-02de94f0be8fac589`

#### Subnets

Subnets are smaller networks inside your VPC. Think of them as rooms inside
your office building. We have four subnets:

- **Public Subnet 1** (`subnet-0a2a2fb650f102eae`, 10.0.1.0/24, us-east-1a):
  Can receive traffic from the internet. The load balancer lives here.
- **Public Subnet 2** (`subnet-05ba94fc1dc103c66`, 10.0.2.0/24, us-east-1b):
  Same as above, but in a different data center for redundancy.
- **Private Subnet 1** (`subnet-07ecd231f80ef74ea`, 10.0.3.0/24, us-east-1a):
  Cannot receive traffic from the internet directly. Our app containers and
  database live here.
- **Private Subnet 2** (`subnet-03a56b25c4680f3b4`, 10.0.4.0/24, us-east-1b):
  Same as above, in a different data center.

Why two of each? AWS requires resources like load balancers and databases to
span at least two Availability Zones (data centers) for reliability. If one
data center has a power outage, the other keeps running.

#### ALB (Application Load Balancer)

The ALB is like a receptionist at the front door of your office. When a user
visits your website, the request goes to the ALB first. The ALB looks at the
URL path and decides where to send the request:

- `/api/*` or `/media/*` --> send to the backend (Django)
- Everything else --> send to the frontend (React/Nginx)

This is called **path-based routing**. We have two ALBs, one for each
environment:

- **QA ALB**: `pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com`
- **Prod ALB**: `pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com`

#### ECS Fargate (Elastic Container Service)

ECS is the service that runs your Docker containers. Fargate is the "serverless"
version, meaning you do not manage any servers yourself. You just say "run this
Docker image" and AWS handles everything.

Key ECS concepts:
- **Cluster**: A logical grouping of services. Ours is `pw-e2e-cluster`.
- **Task Definition**: A blueprint that says "use this Docker image, give it
  this much CPU and memory, set these environment variables."
- **Service**: A running instance of a task definition. It keeps your container
  alive and restarts it if it crashes.
- **Task**: A single running copy of a container.

We have four services:
1. `pw-e2e-qa-backend` -- Django API for QA
2. `pw-e2e-qa-frontend` -- React/Nginx for QA
3. `pw-e2e-prod-backend` -- Django API for Production
4. `pw-e2e-prod-frontend` -- React/Nginx for Production

#### ECR (Elastic Container Registry)

ECR is like Docker Hub, but private and hosted inside AWS. We push our Docker
images here so ECS can pull them. We have two repositories:

- `pw-e2e/backend` -- stores Django Docker images
- `pw-e2e/frontend` -- stores React/Nginx Docker images

#### RDS (Relational Database Service)

RDS is a managed PostgreSQL database. "Managed" means AWS handles backups,
updates, and failover. We do not SSH into a database server. We just connect
to an endpoint.

**Our RDS**: `pw-e2e-db.c4dga0e4q44i.us-east-1.rds.amazonaws.com`

The database runs in the private subnets, meaning it is not accessible from
the internet. Only our ECS containers can reach it.

#### IAM (Identity and Access Management)

IAM controls who can do what in your AWS account. We created three roles:

1. **ECS Execution Role** (`pw-e2e-ecs-execution-role`): Lets ECS pull Docker
   images from ECR and write logs to CloudWatch.
2. **ECS Task Role** (`pw-e2e-ecs-task-role`): The permissions your app has
   while running. Ours is minimal.
3. **GitHub Actions Role** (`pw-e2e-github-actions`): Lets GitHub Actions
   deploy to our AWS account without storing long-lived passwords. Uses OIDC
   (OpenID Connect) for secure, temporary credentials.

**GitHub Actions Role ARN**: `arn:aws:iam::067744549244:role/pw-e2e-github-actions`

#### CloudWatch

CloudWatch collects logs from your containers. When your Django app prints
something or your Nginx logs a request, it appears in CloudWatch. We created
four log groups:

- `/ecs/pw-e2e/qa/backend`
- `/ecs/pw-e2e/qa/frontend`
- `/ecs/pw-e2e/prod/backend`
- `/ecs/pw-e2e/prod/frontend`

#### Security Groups

A Security Group is a firewall. It controls which traffic can enter and leave
a resource. Think of it as a bouncer at a door who checks a list.

We have three Security Groups:

| Security Group | ID | Allows Inbound |
|---|---|---|
| ALB SG | `sg-0fae145f61dc4f131` | Port 80 and 443 from anywhere (the internet) |
| ECS SG | `sg-07785c59afed94af2` | Port 80 and 8000 from ALB SG only |
| RDS SG | `sg-01991da41352a738c` | Port 5432 from ECS SG only |

This creates a chain: Internet --> ALB --> ECS --> RDS. Nothing can skip a step.

#### NAT Gateway

A NAT (Network Address Translation) Gateway lets resources in private subnets
make outbound requests to the internet. Our ECS containers are in private
subnets (they cannot receive incoming internet traffic), but they still need to
reach the internet to pull Docker images from ECR. The NAT Gateway handles this.

It lives in a public subnet and acts as a middleman: the private container says
"I need to download something", the NAT Gateway fetches it on the container's
behalf.

#### Internet Gateway

The Internet Gateway is attached to the VPC and allows public subnets to
communicate with the internet. Without it, nothing in your VPC can reach the
outside world or be reached from the outside world.

### What is Docker?

Docker is a tool that packages your application and all its dependencies into a
single unit called a **container**. A container is like a lightweight virtual
machine that runs the same way everywhere -- on your laptop, in CI, and on AWS.

Why do we need Docker for deployment?

1. **Consistency**: "It works on my machine" becomes "it works everywhere."
2. **Isolation**: Each service (frontend, backend, database) runs in its own
   container and cannot interfere with the others.
3. **Reproducibility**: The exact same image that was tested in CI is deployed
   to production. No surprises.

Key Docker concepts:
- **Dockerfile**: A recipe that describes how to build an image.
- **Image**: A snapshot of your application and its dependencies.
- **Container**: A running instance of an image.
- **Registry**: A place to store images (ECR in our case).
- **Multi-stage build**: A technique where you use one container to build your
  app and a different, smaller container to run it.

### How Does Path-Based Routing Work? (ALB Diagram)

```
   User's Browser
        |
        | http://pw-e2e-qa-alb-XXXX.us-east-1.elb.amazonaws.com/
        v
 +-------------------------------+
 |    Application Load Balancer   |
 |    (ALB - in public subnets)   |
 +-------------------------------+
        |             |
        |             |
   URL starts     URL starts
   with /api/*    with anything
   or /media/*    else (/)
        |             |
        v             v
 +-----------+  +-----------+
 | Backend   |  | Frontend  |
 | Target    |  | Target    |
 | Group     |  | Group     |
 | (port     |  | (port 80) |
 |  8000)    |  |           |
 +-----------+  +-----------+
        |             |
        v             v
 +-----------+  +-----------+
 | Django    |  | Nginx +   |
 | Gunicorn  |  | React SPA |
 | Container |  | Container |
 +-----------+  +-----------+
```

The ALB listener on port 80 has three rules:
1. **Priority 10**: If the path matches `/api/*`, forward to the backend target
   group.
2. **Priority 20**: If the path matches `/media/*`, forward to the backend
   target group.
3. **Default**: Everything else goes to the frontend target group.

---

## Part 3: Our CI Pipeline (playwright.yml) - Line by Line

This file lives at `.github/workflows/playwright.yml` and runs our end-to-end
tests on every push and pull request. Let us go through every line.

```yaml
name: Playwright E2E Tests
```
The name that appears in the GitHub Actions tab. This is a display name only.

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
```
**Triggers**: This workflow runs when:
- Someone pushes to the `main` or `develop` branch.
- Someone opens (or updates) a pull request targeting `main`.
- Someone manually clicks "Run workflow" in the GitHub UI (`workflow_dispatch`).

```yaml
env:
  BASE_URL: http://localhost:3000
  API_BASE_URL: http://localhost:8000
  ADMIN_EMAIL: admin@example.com
  ADMIN_PASSWORD: Admin123!
  USER_EMAIL: user@example.com
  USER_PASSWORD: User123!
  CI: true
```
**Environment variables** available to every step. These tell Playwright where
the app is running and which credentials to use. `CI: true` tells various tools
they are running in a CI environment (not a developer's laptop).

```yaml
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30
```
We have one job called `e2e-tests`. It runs on a fresh Ubuntu machine. If the
entire job takes more than 30 minutes, GitHub kills it. This prevents stuck
jobs from wasting resources.

```yaml
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
```
**Step 1**: Clone the repository onto the runner machine. `actions/checkout@v4`
is a pre-built action maintained by GitHub. Without this, the runner has no code
to work with.

```yaml
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: tests/playwright-e2e/package-lock.json
```
**Step 2**: Install Node.js version 20. The `cache` option caches downloaded npm
packages so future runs are faster. We point it at our `package-lock.json` so
it knows when to invalidate the cache.

```yaml
      - name: Start application with Docker Compose
        run: |
          docker compose up -d --wait
          echo "Waiting for services to be ready..."
          timeout 120 bash -c 'until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 2; done'
          timeout 120 bash -c 'until curl -s http://localhost:8000/api/users/login/ > /dev/null 2>&1; do sleep 2; done'
          echo "Services are ready."
```
**Step 3**: Start the entire application (database, backend, frontend) using
Docker Compose. The `-d` flag runs everything in the background. `--wait` waits
for health checks. Then we poll both the frontend (port 3000) and backend (port
8000) with `curl` until they respond, with a 120-second timeout.

```yaml
      - name: Install Playwright dependencies
        working-directory: tests/playwright-e2e
        run: |
          npm ci
          npx playwright install --with-deps chromium firefox webkit
```
**Step 4**: Install test dependencies. `npm ci` installs packages from the lock
file (faster and more reliable than `npm install`). Then we install three
browser engines: Chromium, Firefox, and WebKit. `--with-deps` also installs OS
libraries the browsers need.

```yaml
      - name: Run Playwright tests
        working-directory: tests/playwright-e2e
        run: npx playwright test
```
**Step 5**: Run the actual tests. This executes all test files in all three
browsers.

```yaml
      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: tests/playwright-e2e/playwright-report/
          retention-days: 14
```
**Step 6**: Upload the HTML test report as an artifact. `if: always()` means
this step runs even if the tests failed -- that is when you need the report
most. The report is kept for 14 days.

```yaml
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: tests/playwright-e2e/test-results/
          retention-days: 7
```
**Step 7**: Upload raw test results (screenshots, videos, traces of failed
tests). Kept for 7 days.

```yaml
      - name: Stop Docker Compose
        if: always()
        run: docker compose down -v
```
**Step 8**: Tear down all containers and delete volumes (`-v`). `if: always()`
ensures cleanup happens even if something failed.

---

## Part 4: Our CD Pipeline (cd.yml) - Line by Line

This file lives at `.github/workflows/cd.yml` and handles building, deploying,
testing, approving, and promoting code to production.

### Header and Triggers

```yaml
name: CD Pipeline
```
Display name in the GitHub Actions UI.

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```
Runs when code is pushed to `main` or manually triggered. Unlike the CI
pipeline, this does NOT run on pull requests -- we only deploy merged code.

```yaml
env:
  AWS_REGION: us-east-1
  ECR_BACKEND: pw-e2e/backend
  ECR_FRONTEND: pw-e2e/frontend
  ECS_CLUSTER: pw-e2e-cluster
```
Global environment variables used by all jobs. These identify our AWS region
and resource names.

```yaml
permissions:
  id-token: write
  contents: read
```
This is critical for OIDC authentication. `id-token: write` lets the workflow
request a temporary identity token from GitHub. AWS uses this token to verify
that the request is really coming from our GitHub repository, and then grants
temporary AWS credentials. No long-lived AWS passwords are stored anywhere.

### Job 1: Build and Push Docker Images

```yaml
  build-and-push:
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.vars.outputs.sha_short }}
```
This job runs on Ubuntu and produces one output: the short git SHA, which we
use as the Docker image tag. This means every image is tagged with the exact
commit it was built from.

```yaml
      - name: Checkout code
        uses: actions/checkout@v4
```
Clone the repo.

```yaml
      - name: Set short SHA
        id: vars
        run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
```
Get the first 7 characters of the commit hash (like `f2f9caa`) and save it as
a step output. Later steps and jobs can read this value.

```yaml
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}
```
Use OIDC to assume the GitHub Actions IAM role. This gives the workflow
temporary AWS credentials (valid for about 1 hour) without any stored passwords.

```yaml
      - name: Login to ECR
        id: ecr-login
        uses: aws-actions/amazon-ecr-login@v2
```
Authenticate with ECR so we can push Docker images.

```yaml
      - name: Build and push backend image
        env:
          ECR_REGISTRY: ${{ steps.ecr-login.outputs.registry }}
          IMAGE_TAG: ${{ steps.vars.outputs.sha_short }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_BACKEND:$IMAGE_TAG -t $ECR_REGISTRY/$ECR_BACKEND:latest ./backend
          docker push $ECR_REGISTRY/$ECR_BACKEND:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_BACKEND:latest
```
Build the backend Docker image from the `./backend` directory. Tag it twice:
once with the commit SHA (for traceability) and once as `latest` (so ECS task
definitions that reference `latest` get the newest image). Push both tags.

```yaml
      - name: Build and push frontend image
        ...
```
Same process for the frontend image.

### Job 2: Deploy to QA

```yaml
  deploy-qa:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: qa
```
This job only runs after `build-and-push` succeeds (`needs`). The `environment:
qa` line links this job to the "qa" GitHub Environment, which can have its own
secrets (like `QA_URL`).

```yaml
      - name: Run database migrations
        run: |
          TASK_ARN=$(aws ecs run-task \
            --cluster $ECS_CLUSTER \
            --task-definition pw-e2e-qa-backend \
            --launch-type FARGATE \
            --network-configuration "${{ secrets.ECS_NETWORK_CONFIG }}" \
            --overrides '{
              "containerOverrides": [{
                "name": "backend",
                "command": ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_data"]
              }]
            }' \
            --query 'tasks[0].taskArn' --output text)
          echo "Migration task: $TASK_ARN"
          aws ecs wait tasks-stopped --cluster $ECS_CLUSTER --tasks $TASK_ARN
```
This is a one-off task (not a long-running service). It starts a backend
container, runs database migrations and seeds test data, then exits. The `wait`
command blocks until the task finishes. The `--overrides` replaces the default
`CMD` (gunicorn) with migration commands.

```yaml
      - name: Update QA backend service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service pw-e2e-qa-backend \
            --force-new-deployment \
            --query 'service.serviceName' --output text
```
Tell ECS to pull the latest image and restart the backend service.
`--force-new-deployment` ensures a new task starts even if the task definition
has not changed (because we use the `latest` tag).

```yaml
      - name: Update QA frontend service
        ...
```
Same for the frontend.

```yaml
      - name: Wait for services to stabilize
        run: |
          aws ecs wait services-stable --cluster $ECS_CLUSTER --services pw-e2e-qa-backend pw-e2e-qa-frontend
```
Block until both services have healthy, running containers. This ensures the
next job (E2E tests) does not start before the app is ready.

### Job 3: E2E Tests Against QA

```yaml
  e2e-tests-qa:
    needs: deploy-qa
    runs-on: ubuntu-latest
    env:
      BASE_URL: ${{ secrets.QA_URL }}
      API_BASE_URL: ${{ secrets.QA_URL }}
      ...
```
Runs after QA deployment. Points Playwright at the live QA URL instead of
localhost. Only installs Chromium (not all three browsers) to save time -- the
CI pipeline already tested on all browsers.

```yaml
      - name: Run full E2E test suite against QA
        working-directory: tests/playwright-e2e
        run: npx playwright test --project chromium
```
Run the full test suite against the deployed QA environment. This tests the
real infrastructure, not just a local Docker Compose setup.

```yaml
      - name: Upload QA test report
        ...
```
Save the report as `qa-playwright-report` for the QA Engineer to review.

### Job 4: Manual Approval Gate

```yaml
  approve-prod:
    needs: e2e-tests-qa
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Approval confirmed
        run: echo "Production deployment approved"
```
This is the most important quality gate. `environment: production` links to the
"production" GitHub Environment, which is configured to require manual approval
from designated reviewers.

**What happens**: The pipeline pauses here. A notification is sent to the
reviewers. They can look at the QA test report, manually test the QA
environment, and then either:
- **Approve**: The pipeline continues to deploy to production.
- **Reject**: The pipeline stops. Nothing reaches production.

The step itself just prints a confirmation message. The real magic is in the
`environment: production` configuration in GitHub Settings.

### Job 5: Deploy to Production

```yaml
  deploy-prod:
    needs: approve-prod
    ...
```
Identical structure to `deploy-qa`, but uses `pw-e2e-prod-backend` and
`pw-e2e-prod-frontend` services. Note that production migrations do NOT run
`seed_data` -- we only seed test data in QA.

### Job 6: Smoke Tests

```yaml
  smoke-tests-prod:
    needs: deploy-prod
    ...
      - name: Run smoke tests against Production
        working-directory: tests/playwright-e2e
        run: npx playwright test --project chromium --grep @smoke
```
After deploying to production, we run a subset of tests tagged with `@smoke`.
These are fast, critical-path tests (like "can a user log in?"). We do not run
the full suite against production to minimize risk and execution time.

### What is a GitHub Environment?

A GitHub Environment is a configuration in your repository settings that
represents a deployment target. Each environment can have:

- **Its own secrets**: QA has `QA_URL`, production has `PROD_URL`.
- **Protection rules**: "Require approval from these people before deploying."
- **Wait timers**: "Wait 5 minutes before deploying" (we do not use this).
- **Deployment branches**: "Only the main branch can deploy to production."

### What is a Manual Approval Gate?

A manual approval gate is a protection rule on a GitHub Environment. When a job
references an environment with this rule, the pipeline pauses and sends a
notification. Designated reviewers must approve the deployment before the
pipeline continues. This ensures a human verifies quality before code reaches
users.

To set up an approval gate:
1. Go to your repo Settings > Environments > production.
2. Check "Required reviewers."
3. Add the GitHub usernames of people who can approve.
4. Save.

---

## Part 5: AWS Infrastructure - What We Built

### Network Diagram

```
                        INTERNET
                           |
                    +------+------+
                    |   Internet  |
                    |   Gateway   |
                    +------+------+
                           |
          VPC: 10.0.0.0/16 (vpc-02de94f0be8fac589)
  +--------|-------------------------------------------+
  |        |                                           |
  |  +-----+-------- PUBLIC SUBNETS --+               |
  |  |                                |               |
  |  | subnet-0a2a..   subnet-05ba.. |               |
  |  | 10.0.1.0/24     10.0.2.0/24   |               |
  |  | (us-east-1a)    (us-east-1b)  |               |
  |  |                                |               |
  |  | +----------------------------+ |               |
  |  | | QA ALB    |   Prod ALB     | |               |
  |  | | (sg-0fae..)                | |               |
  |  | +----------------------------+ |               |
  |  |        |                       |               |
  |  | +------+------+               |               |
  |  | |  NAT Gateway |              |               |
  |  | +--------------+              |               |
  |  +--------------------------------+               |
  |        |              |                            |
  |  +-----+------ PRIVATE SUBNETS ---+               |
  |  |                                |               |
  |  | subnet-07ec..   subnet-03a5.. |               |
  |  | 10.0.3.0/24     10.0.4.0/24   |               |
  |  | (us-east-1a)    (us-east-1b)  |               |
  |  |                                |               |
  |  | +----------------------------+ |               |
  |  | | ECS Fargate Containers     | |               |
  |  | | (sg-07785c..)              | |               |
  |  | |                            | |               |
  |  | | QA Backend  | QA Frontend  | |               |
  |  | | Prod Backend| Prod Frontend| |               |
  |  | +----------------------------+ |               |
  |  |                                |               |
  |  | +----------------------------+ |               |
  |  | | RDS PostgreSQL             | |               |
  |  | | (sg-01991d..)              | |               |
  |  | | pw-e2e-db.c4dga...         | |               |
  |  | +----------------------------+ |               |
  |  +--------------------------------+               |
  +----------------------------------------------------+
```

### How Traffic Flows (Step by Step)

1. A user opens their browser and types the QA URL.
2. Their browser performs a DNS lookup and gets the ALB's IP address.
3. The request arrives at the Internet Gateway of our VPC.
4. The Internet Gateway forwards it to the ALB in the public subnets.
5. The ALB's Security Group checks: "Is this traffic on port 80?" Yes, allow.
6. The ALB inspects the URL path:
   - If it starts with `/api/` or `/media/`, route to the backend target group.
   - Otherwise, route to the frontend target group.
7. The ALB forwards the request to an ECS container in the private subnets.
8. The ECS Security Group checks: "Is this from the ALB SG?" Yes, allow.
9. If it is a frontend request, Nginx serves the React HTML/JS/CSS.
10. If it is a backend request, Gunicorn processes it through Django.
11. If Django needs data, it connects to RDS on port 5432.
12. The RDS Security Group checks: "Is this from the ECS SG?" Yes, allow.
13. RDS returns the data to Django, which formats a JSON response.
14. The response travels back: Django --> ALB --> Internet Gateway --> User.

### Why Do Private Subnets Need a NAT Gateway?

ECS containers in private subnets cannot reach the internet directly. But they
need internet access for two reasons:

1. **Pull Docker images from ECR**: When ECS starts a new task, it downloads
   the Docker image from ECR. Although ECR is an AWS service, pulling images
   goes through the internet (unless you set up VPC endpoints, which cost
   extra).
2. **Other outbound calls**: Your app might call external APIs (payment
   gateways, email services, etc.).

The NAT Gateway sits in a public subnet (which has internet access via the
Internet Gateway). Private subnet traffic is routed through the NAT Gateway.
The NAT Gateway translates the private IP to its own public IP, makes the
request, and sends the response back to the private container.

```
 Private Container (10.0.3.x)
        |
        | "I need to reach the internet"
        v
 NAT Gateway (in public subnet, has public IP)
        |
        | Makes the request on the container's behalf
        v
     INTERNET
        |
        | Response comes back
        v
 NAT Gateway
        |
        | Forwards response to the container
        v
 Private Container (10.0.3.x)
```

---

## Part 6: The Setup Process (Step by Step)

### Prerequisites

Before you begin, you need:

1. **An AWS Account**: Sign up at https://aws.amazon.com. You will need a
   credit card, but there is a free tier for many services.
2. **AWS CLI**: A command-line tool for interacting with AWS.
3. **A GitHub account** with a repository for your project.
4. **Docker Desktop**: Installed on your local machine for building images.
5. **A terminal**: macOS Terminal, Windows PowerShell, or Linux shell.

### Step 1: Install AWS CLI

**macOS (using Homebrew)**:
```bash
brew install awscli
```

**macOS / Linux (official installer)**:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify installation**:
```bash
aws --version
# Should print something like: aws-cli/2.x.x Python/3.x.x ...
```

### Step 2: Create AWS Access Keys

1. Log into the AWS Console at https://console.aws.amazon.com.
2. Click your account name in the top right, then "Security credentials."
3. Under "Access keys," click "Create access key."
4. Choose "Command Line Interface (CLI)."
5. Copy the Access Key ID and Secret Access Key somewhere safe.
6. Run:
   ```bash
   aws configure
   ```
   Enter your Access Key ID, Secret Access Key, region (`us-east-1`), and
   output format (`json`).

### Step 3: Run setup-aws.sh

The `infra/setup-aws.sh` script creates all AWS infrastructure in one command:

```bash
chmod +x infra/setup-aws.sh
./infra/setup-aws.sh
```

Here is what each section of the script creates:

| Section | What It Creates | Why |
|---------|----------------|-----|
| [1/10] ECR Repositories | `pw-e2e/backend`, `pw-e2e/frontend` | Private Docker image storage |
| [2/10] VPC | VPC with 10.0.0.0/16 CIDR | Isolated network for our app |
| [3/10] Subnets | 2 public + 2 private subnets | ALB in public, app in private |
| [4/10] Gateways | Internet Gateway + NAT Gateway | Internet access for both subnet types |
| [5/10] Route Tables | Public RT (to IGW) + Private RT (to NAT) | Traffic routing rules |
| [6/10] Security Groups | ALB SG, ECS SG, RDS SG | Firewall rules (who talks to whom) |
| [7/10] RDS | PostgreSQL 16 on db.t3.micro | Application database |
| [8/10] ECS Cluster | Cluster + CloudWatch log groups | Container orchestration + logging |
| [9/10] IAM Roles | Execution role, task role, GitHub Actions role | Permissions for ECS and CI/CD |
| [10/10] ALB + Services | ALBs, target groups, listeners, ECS services | Load balancing + running containers |

The script is idempotent -- you can run it multiple times safely. It checks if
each resource already exists before creating it.

### Step 4: Add GitHub Secrets

Go to your repository on GitHub: Settings > Secrets and variables > Actions.

Add these **repository-level secrets**:

| Secret Name | Value | Purpose |
|---|---|---|
| `AWS_ROLE_ARN` | `arn:aws:iam::067744549244:role/pw-e2e-github-actions` | IAM role for OIDC auth |
| `ECS_NETWORK_CONFIG` | `awsvpcConfiguration={subnets=[subnet-07ec...,subnet-03a5...],securityGroups=[sg-07785...],assignPublicIp=DISABLED}` | Network config for ECS run-task |

Add these **environment-level secrets** (Settings > Environments):

**qa environment**:
| Secret Name | Value |
|---|---|
| `QA_URL` | `http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com` |

**production environment**:
| Secret Name | Value |
|---|---|
| `PROD_URL` | `http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com` |

### Step 5: Create GitHub Environments

1. Go to repository Settings > Environments.
2. Click "New environment", name it `qa`, click "Configure environment."
   - Add the `QA_URL` secret.
   - No approval required for QA.
3. Click "New environment", name it `production`, click "Configure environment."
   - Add the `PROD_URL` secret.
   - Check "Required reviewers" and add the GitHub usernames of team members
     who can approve production deployments.
   - Optionally set "Deployment branches" to "Selected branches" and add `main`.

### Step 6: Build and Push Initial Docker Images

Before the first deployment, you must push images to ECR manually:

```bash
# Log in to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 067744549244.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend (for linux/amd64 -- required for ECS Fargate)
docker build --platform linux/amd64 -t 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/backend:latest ./backend
docker push 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/backend:latest

# Build and push frontend
docker build --platform linux/amd64 -t 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/frontend:latest ./frontend
docker push 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/frontend:latest
```

### Step 7: Run Database Migrations

Run a one-off ECS task to set up the database tables:

```bash
aws ecs run-task \
  --cluster pw-e2e-cluster \
  --task-definition pw-e2e-qa-backend \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-07ecd231f80ef74ea,subnet-03a56b25c4680f3b4],securityGroups=[sg-07785c59afed94af2],assignPublicIp=DISABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "backend",
      "command": ["sh", "-c", "python manage.py migrate --noinput && python manage.py seed_data"]
    }]
  }'
```

Repeat for production (using `pw-e2e-prod-backend`, without `seed_data`).

---

## Part 7: How Deployments Work

### What Happens When You Push Code to Main

Here is the complete timeline of events after `git push origin main`:

#### 1. Build and Push (Job 1, ~3-5 minutes)

- GitHub detects the push and starts the CD workflow.
- The runner checks out your code.
- It computes the short SHA of the commit (e.g., `f2f9caa`).
- It authenticates with AWS using OIDC (no passwords stored).
- It logs into ECR.
- It builds the backend Docker image and pushes it with two tags: `f2f9caa`
  and `latest`.
- It builds the frontend Docker image and pushes it with the same two tags.

#### 2. Deploy to QA (Job 2, ~5-8 minutes)

- A one-off ECS task runs database migrations and seeds test data.
- The workflow waits for the migration task to finish.
- It tells ECS to update the QA backend service (pull new `latest` image).
- It tells ECS to update the QA frontend service.
- It waits until both services are stable (health checks passing).

#### 3. E2E Tests Against QA (Job 3, ~5-10 minutes)

- A fresh runner installs Node.js and Playwright.
- Playwright runs the full test suite against the live QA URL.
- Test results are uploaded as artifacts.
- If any test fails, the pipeline stops here. Production is protected.

#### 4. Manual Approval (Job 4, pauses indefinitely)

- The pipeline pauses and shows a yellow "Waiting" status.
- GitHub sends a notification to the designated reviewers.
- The QA Engineer:
  1. Downloads the test report artifact and reviews it.
  2. Optionally opens the QA URL in their browser and tests manually.
  3. Goes to the GitHub Actions run page.
  4. Clicks "Review deployments."
  5. Checks the "production" environment.
  6. Clicks "Approve and deploy" or "Reject."

If the reviewer clicks "Approve and deploy," the pipeline continues.
If they click "Reject," the pipeline fails and production is unchanged.

#### 5. Deploy to Production (Job 5, ~5-8 minutes)

- Same as the QA deployment, but targeting production services.
- Migrations run (without seed data).
- Backend and frontend services are updated.
- The workflow waits for stability.

#### 6. Smoke Tests (Job 6, ~3-5 minutes)

- Playwright runs only tests tagged `@smoke` against the production URL.
- These are fast, high-priority tests: login works, homepage loads, core
  features function.
- If smoke tests fail, the team is alerted. The deployment already happened
  (you may need to roll back manually).

### Total Time

A full pipeline run from push to production takes approximately 20-35 minutes,
plus however long the QA Engineer takes to review and approve.

---

## Part 8: Docker Configuration

### Backend Dockerfile - Every Line Explained

File: `backend/Dockerfile`

```dockerfile
FROM python:3.13-slim
```
Start from the official Python 3.13 image (slim variant). "Slim" means it has
fewer OS packages, making the image smaller (about 150MB vs 900MB for the full
image).

```dockerfile
WORKDIR /app
```
Set the working directory inside the container to `/app`. All subsequent
commands run from this directory.

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*
```
Install system packages needed to compile the `psycopg2` Python library (the
PostgreSQL driver). `gcc` is the C compiler, `libpq-dev` is the PostgreSQL
client library. We remove the apt cache to save space.

```dockerfile
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```
Copy the requirements file first and install Python packages. This is a Docker
caching optimization: if `requirements.txt` has not changed, Docker reuses this
layer instead of reinstalling everything.

```dockerfile
COPY . .
```
Copy all backend source code into the container.

```dockerfile
RUN mkdir -p /app/media /app/staticfiles
```
Create directories for uploaded files and collected static files.

```dockerfile
RUN SECRET_KEY=build-placeholder python manage.py collectstatic --noinput 2>/dev/null || true
```
Collect Django's static files (admin CSS, etc.). We set a dummy `SECRET_KEY`
because Django requires one, but the real key is set at runtime via environment
variables.

```dockerfile
RUN adduser --disabled-password --no-create-home appuser && \
    chown -R appuser:appuser /app
USER appuser
```
Create a non-root user and switch to it. This is a security best practice:
if an attacker compromises the container, they cannot get root access.

```dockerfile
EXPOSE 8000
```
Document that the container listens on port 8000. This is informational only;
it does not actually open the port.

```dockerfile
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-", "--error-logfile", "-"]
```
The default command when the container starts. Gunicorn is a production WSGI
server (much faster than Django's `runserver`). It binds to all interfaces on
port 8000, runs 3 worker processes, and sends logs to stdout/stderr (which
CloudWatch captures).

### Frontend Dockerfile - Every Line Explained

File: `frontend/Dockerfile`

This uses a **multi-stage build** -- two separate stages in one Dockerfile.

```dockerfile
# Stage 1: Build the React application
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
```
**Stage 1 (build)**: Start from Node.js 22, install dependencies, copy source
code, and run `npm run build`. This compiles the React app into static HTML,
CSS, and JavaScript files in the `dist/` directory. This stage is only used
during the build and is thrown away.

```dockerfile
# Stage 2: Serve the built files with Nginx
FROM nginx:alpine
COPY nginx.conf.production /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
**Stage 2 (serve)**: Start from a tiny Nginx image. Copy the production Nginx
config and the built files from Stage 1. The final image contains only Nginx
and the static files -- no Node.js, no source code, no `node_modules`. This
makes the image very small (about 40MB).

### Why nginx.conf vs nginx.conf.production?

We have two Nginx configurations because the frontend needs different behavior
in local development versus production.

**nginx.conf (local development)**:
```
location /api/ {
    proxy_pass http://backend:8000;
}
location /media/ {
    proxy_pass http://backend:8000;
}
```
In local development with Docker Compose, all containers are on the same Docker
network. The frontend Nginx proxies `/api/*` requests to the container named
`backend`. The hostname `backend` is resolved by Docker's internal DNS.

**nginx.conf.production (ECS / AWS)**:
```
location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
}
```
In production, there is NO proxy configuration. The frontend Nginx only serves
static files. All `/api/*` routing is handled by the ALB before the request
even reaches the Nginx container. The Nginx container does not know (or need to
know) where the backend is.

### Why Docker Compose Uses a Volume Mount for nginx.conf

In `docker-compose.yml`:
```yaml
volumes:
  - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf
```

The Dockerfile copies `nginx.conf.production` into the image. But for local
development, we override it with a volume mount that swaps in `nginx.conf`
(the version with proxy rules). This way:
- The Docker image always has the production config baked in.
- Local development gets the dev config via the volume mount.
- No code changes needed to switch between environments.

### Multi-Stage Builds Explained

A multi-stage build uses multiple `FROM` statements in a single Dockerfile.
Each `FROM` starts a new stage. You can copy files between stages.

Why is this useful?

- **Stage 1** has everything needed to BUILD the app (Node.js, npm, source
  code, build tools). This stage might be 1GB.
- **Stage 2** has only what is needed to RUN the app (Nginx + static files).
  This stage is about 40MB.

The final image is Stage 2 only. All the build tools are thrown away.

### Why We Build for linux/amd64 Platform

ECS Fargate tasks run on `linux/amd64` (Intel/AMD 64-bit) processors. If you
build a Docker image on a Mac with an Apple Silicon chip (M1, M2, M3), Docker
defaults to `linux/arm64`. This ARM image will NOT run on ECS Fargate and will
fail with a cryptic error like "exec format error."

The fix: always specify `--platform linux/amd64` when building images for ECS:

```bash
docker build --platform linux/amd64 -t my-image .
```

On GitHub Actions runners (which are x86_64), this is not needed because the
default platform is already `linux/amd64`. But it is critical when building
locally on Apple Silicon.

---

## Part 9: Problems We Solved

### Problem 1: Frontend Nginx Crash on ECS

**Symptom**: The frontend container started and immediately crashed in a restart
loop on ECS. The logs showed:

```
host not found in upstream "backend" in /etc/nginx/conf.d/default.conf
```

**Cause**: The original Dockerfile copied `nginx.conf` (the dev version) which
had `proxy_pass http://backend:8000`. In Docker Compose, "backend" is a valid
hostname because Docker DNS resolves container names. But on ECS, each container
runs in its own task with its own network namespace. There is no container named
"backend" to resolve.

**Fix**: We created `nginx.conf.production` with no proxy rules at all. The
Dockerfile now copies this production config. In Docker Compose, the dev config
is swapped in via a volume mount. The ALB handles all routing in production, so
the frontend never needs to know about the backend.

### Problem 2: RDS Password with Special Characters

**Symptom**: ECS tasks failed to connect to the database. The error was about
authentication failure.

**Cause**: The original database password contained special characters that
caused issues when passed through JSON in the ECS task definition. Characters
like `@`, `$`, and `!` can be interpreted differently in shell strings, JSON,
and URL-encoded connection strings.

**Fix**: We used a password with only alphanumeric characters plus underscores
(`PwE2E_Secure_2024!`), being careful to properly escape the `!` in the shell
script. In the task definition JSON, it is passed as a plain environment
variable.

### Problem 3: RDS SSL Requirement

**Symptom**: Database connections from ECS failed with SSL-related errors.

**Cause**: RDS PostgreSQL 16 requires SSL by default. The Django database
settings did not include SSL configuration.

**Fix**: In the Django settings, the database configuration relies on the
default PostgreSQL behavior. Since both the ECS containers and RDS instance are
within the same VPC (private subnets), and RDS is configured to accept
connections from the ECS security group, the connection works within the
trusted network. For production, you can add `'OPTIONS': {'sslmode': 'require'}`
to the database settings for extra security.

### Problem 4: ECS Task Definition Versioning

**Symptom**: After updating a task definition, the old service kept running the
old version.

**Cause**: ECS services reference a specific task definition revision. When you
register a new task definition, ECS does not automatically update the service.

**Fix**: We use `aws ecs update-service --force-new-deployment` in the CD
pipeline. This tells ECS to start a new task even if the task definition
revision has not changed. Combined with the `latest` Docker tag, this ensures
ECS pulls the newest image.

### Problem 5: Health Check Endpoint Design

**Symptom**: The ALB kept marking backend containers as unhealthy.

**Cause**: The ALB health check tried to reach the backend, but all Django
endpoints required authentication (returned 401 Unauthorized).

**Fix**: We added a dedicated health check endpoint in `backend/config/urls.py`:

```python
def health_check(request):
    """Health check endpoint for ALB/ECS."""
    return JsonResponse({'status': 'healthy'}, status=200)

urlpatterns = [
    path('api/health/', health_check),
    ...
]
```

This endpoint returns a 200 status with no authentication required. The ALB
target group is configured to check `/api/health/` every 30 seconds.

### Problem 6: ARM vs AMD64 Docker Images

**Symptom**: ECS tasks failed to start with "exec format error" or similar
messages.

**Cause**: Docker images were built on an Apple Silicon Mac (ARM architecture).
ECS Fargate runs on AMD64 (Intel) architecture. An ARM image cannot run on an
AMD64 host.

**Fix**: Always build with `--platform linux/amd64` when pushing images from
a Mac:

```bash
docker build --platform linux/amd64 -t my-image .
```

On GitHub Actions runners (which are AMD64), this is not needed, but it does
not hurt to include it.

---

## Part 10: QA Engineer's Daily Workflow

### Monitoring the Pipeline

1. Go to https://github.com/thein-zaw-22/pw-e2e-fullstack/actions.
2. You will see a list of workflow runs. Each run shows:
   - A green checkmark (passed), red X (failed), or yellow dot (in progress).
   - The commit message that triggered the run.
   - How long it took.
3. Click on a run to see the individual jobs and their status.

### Reviewing Test Results

1. In the workflow run page, scroll to the "Artifacts" section at the bottom.
2. Download `qa-playwright-report` (a ZIP file).
3. Unzip it and open `index.html` in your browser.
4. The report shows:
   - Total tests passed, failed, and skipped.
   - For each failed test: the error message, a screenshot, and a trace file.
   - Execution time for each test.

### Approving or Rejecting Production Deployments

1. When the pipeline reaches the approval step, you will see a yellow banner
   on the workflow run page that says "Review deployments."
2. Click "Review deployments."
3. Check the "production" checkbox.
4. Choose "Approve and deploy" to proceed or "Reject" to stop.
5. Add an optional comment explaining your decision.

**Before approving, you should**:
- Review the QA test report and confirm all tests passed.
- Open the QA URL in your browser and do a quick manual check.
- Look at the commit changes (the "Files changed" tab on the associated PR).

### Checking Application Health

**Quick check via browser**:
- QA: http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com
- Prod: http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com

**Health check endpoint** (should return `{"status": "healthy"}`):
- QA: http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com/api/health/
- Prod: http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com/api/health/

**Via CLI**:
```bash
curl http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com/api/health/
```

### Viewing Logs in CloudWatch

1. Go to the AWS Console: https://console.aws.amazon.com/cloudwatch.
2. Make sure you are in `us-east-1` (top right corner).
3. In the left menu, click "Log groups."
4. Find the relevant log group:
   - `/ecs/pw-e2e/qa/backend` -- QA Django logs
   - `/ecs/pw-e2e/qa/frontend` -- QA Nginx logs
   - `/ecs/pw-e2e/prod/backend` -- Production Django logs
   - `/ecs/pw-e2e/prod/frontend` -- Production Nginx logs
5. Click a log group, then click the most recent log stream.
6. You will see the container's stdout/stderr output.

**Via CLI**:
```bash
# Get the most recent log events from QA backend
aws logs tail /ecs/pw-e2e/qa/backend --since 1h --region us-east-1
```

### Running Tests Manually Against Any Environment

You can run Playwright tests locally against any deployed environment:

```bash
cd tests/playwright-e2e
npm install
npx playwright install --with-deps chromium

# Against QA
BASE_URL=http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com \
API_BASE_URL=http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=Admin123! \
npx playwright test --project chromium

# Against Production (only smoke tests)
BASE_URL=http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com \
API_BASE_URL=http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=Admin123! \
npx playwright test --project chromium --grep @smoke
```

You can also trigger the CI workflow manually from the GitHub Actions tab by
clicking "Run workflow" and selecting a branch.

---

## Part 11: Cost and Cleanup

### What Each AWS Service Costs

All prices are approximate for `us-east-1` as of 2025. Prices may vary.

| Service | Resource | Approximate Monthly Cost |
|---------|----------|--------------------------|
| **ECS Fargate** | 4 tasks (0.25 vCPU, 0.5 GB each) | ~$30-40 |
| **RDS** | db.t3.micro (PostgreSQL) | ~$15 (free tier eligible for 12 months) |
| **NAT Gateway** | 1 gateway + data processing | ~$32 + $0.045/GB |
| **ALB** | 2 load balancers | ~$32 ($16 each) |
| **ECR** | Image storage | ~$1-3 |
| **CloudWatch** | Logs | ~$1-5 |
| **Elastic IP** | 1 (attached to NAT Gateway) | Free while attached |
| **Data Transfer** | Outbound to internet | ~$1-5 |

### Estimated Monthly Total

For a small project like ours with minimal traffic:

| Scenario | Monthly Cost |
|----------|-------------|
| Running 24/7 with free tier | ~$80-100 |
| Running 24/7 without free tier | ~$100-120 |
| Running only during business hours | ~$40-60 |

The biggest costs are the NAT Gateway (~$32/month just for existing) and the
two ALBs (~$32/month). For a personal project, consider using a single ALB with
host-based routing or tearing down the infrastructure when not in use.

### How to Tear Down Everything

When you are done with the project and want to stop all charges:

```bash
chmod +x infra/teardown-aws.sh
./infra/teardown-aws.sh
```

The script will ask you to confirm before proceeding. Here is what it deletes,
in order:

| Step | What It Deletes | Why This Order |
|------|----------------|---------------|
| [1/8] | ECS services | Must stop before deleting cluster |
| [2/8] | ALBs, listeners, target groups | Must remove before deleting subnets |
| [3/8] | ECS cluster | Empty now that services are gone |
| [4/8] | RDS instance | Takes several minutes; skips final snapshot |
| [5/8] | NAT Gateway + Elastic IP | Must delete NAT before its Elastic IP |
| [6/8] | Security groups | Must remove after ECS and ALB are gone |
| [7/8] | Subnets, route tables, IGW, VPC | Bottom-up: subnets first, then VPC |
| [8/8] | ECR repos, IAM roles, log groups | Cleanup remaining resources |

**Important**: The script keeps the OIDC provider because it may be shared
across projects.

### What to Watch Out For (Leftover Resources)

After running teardown, double-check these in the AWS Console:

1. **Elastic IPs**: Go to VPC > Elastic IPs. Unattached EIPs cost money.
2. **NAT Gateways**: Go to VPC > NAT Gateways. They can get stuck in "deleting"
   state. Wait and check again.
3. **ECS Task Definitions**: These cannot be deleted, only deregistered. They
   do not cost anything, but they clutter the console. You can deregister them
   manually.
4. **CloudWatch Logs**: If the teardown script failed on log group deletion,
   delete them manually.
5. **RDS Snapshots**: If you created any manual snapshots, they persist and
   cost money. Delete them in RDS > Snapshots.

---

## Part 12: Glossary

| Term | Definition |
|------|-----------|
| **ALB** | Application Load Balancer. Distributes incoming web traffic across multiple targets. |
| **Artifact** | A file produced by a CI/CD pipeline that can be downloaded later (e.g., test reports). |
| **Availability Zone (AZ)** | A separate data center within an AWS region. Used for redundancy. |
| **AWS CLI** | A command-line tool for managing AWS resources. |
| **CIDR** | Classless Inter-Domain Routing. A notation for defining IP address ranges (e.g., 10.0.0.0/16). |
| **CI** | Continuous Integration. Automatically testing code on every push. |
| **CD** | Continuous Deployment/Delivery. Automatically deploying tested code. |
| **Container** | A lightweight, isolated environment for running an application. Created from a Docker image. |
| **CORS** | Cross-Origin Resource Sharing. A security feature that controls which websites can call your API. |
| **Docker** | A platform for building and running containers. |
| **Docker Compose** | A tool for defining and running multi-container Docker applications using a YAML file. |
| **Dockerfile** | A text file with instructions for building a Docker image. |
| **DNS** | Domain Name System. Translates human-readable domain names to IP addresses. |
| **ECR** | Elastic Container Registry. AWS service for storing Docker images. |
| **ECS** | Elastic Container Service. AWS service for running Docker containers. |
| **ECS Fargate** | Serverless compute engine for ECS. No servers to manage. |
| **ECS Service** | A long-running set of tasks maintained by ECS. Restarts crashed containers. |
| **ECS Task** | A single running instance of a task definition (one or more containers). |
| **ECS Task Definition** | A blueprint specifying which Docker image to use, CPU, memory, and environment variables. |
| **Elastic IP** | A static public IPv4 address that you can attach to AWS resources. |
| **Environment (GitHub)** | A named deployment target with its own secrets and protection rules. |
| **Gunicorn** | A Python WSGI HTTP server used to run Django in production. |
| **Health Check** | A periodic request by the ALB to verify a container is alive and responding. |
| **IAM** | Identity and Access Management. AWS service for controlling permissions. |
| **IAM Role** | A set of permissions that can be assumed by a service (not a person). |
| **Idempotent** | An operation that produces the same result whether you run it once or many times. |
| **Image (Docker)** | A read-only template containing your application and its dependencies. |
| **Image Tag** | A label on a Docker image (e.g., `latest` or `f2f9caa`). Used to identify specific versions. |
| **Internet Gateway (IGW)** | An AWS component that allows VPC resources in public subnets to reach the internet. |
| **Job** | A set of steps in a GitHub Actions workflow that run on the same machine. |
| **Listener** | An ALB component that checks for incoming connections on a specific port. |
| **Multi-stage Build** | A Dockerfile technique using multiple FROM statements to create smaller final images. |
| **NAT Gateway** | Network Address Translation gateway. Allows private subnet resources to make outbound internet requests. |
| **Nginx** | A high-performance web server. We use it to serve the React SPA. |
| **OIDC** | OpenID Connect. A protocol for secure authentication without stored passwords. |
| **Path-based Routing** | ALB feature that routes requests to different targets based on the URL path. |
| **Pipeline** | The automated sequence of build, test, and deploy steps. |
| **Private Subnet** | A subnet with no direct internet access. Resources are hidden from the public. |
| **Public Subnet** | A subnet where resources can receive traffic from the internet. |
| **RDS** | Relational Database Service. AWS managed database (PostgreSQL in our case). |
| **Route Table** | A set of rules that determine where network traffic is directed within a VPC. |
| **Runner** | The virtual machine that executes a GitHub Actions job. |
| **Secret** | A value stored securely in GitHub or AWS that should not appear in logs. |
| **Security Group** | A virtual firewall that controls inbound and outbound traffic for AWS resources. |
| **SHA** | Secure Hash Algorithm. In git, a unique identifier for each commit. |
| **Smoke Test** | A quick, basic test that verifies the most critical functionality works. |
| **SPA** | Single Page Application. A web app that loads one HTML page and updates dynamically. |
| **Step** | A single task within a GitHub Actions job. |
| **Subnet** | A range of IP addresses within a VPC. |
| **Target Group** | A group of targets (containers) that an ALB distributes traffic to. |
| **Trigger** | The event that starts a GitHub Actions workflow (push, PR, manual). |
| **VPC** | Virtual Private Cloud. An isolated network within AWS. |
| **Volume (Docker)** | A way to persist data or share files between the host and a container. |
| **Volume Mount** | Attaching a host directory or file to a path inside a container. |
| **Workflow** | A YAML file defining an automated process in GitHub Actions. |
| **WSGI** | Web Server Gateway Interface. A standard for Python web application servers. |
| **YAML** | A human-readable data format used for configuration files. |

---

## Part 13: Quick Reference

### All URLs

| Environment | URL |
|---|---|
| QA Frontend | http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com |
| QA Health Check | http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com/api/health/ |
| Prod Frontend | http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com |
| Prod Health Check | http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com/api/health/ |
| GitHub Repo | https://github.com/thein-zaw-22/pw-e2e-fullstack |
| GitHub Actions | https://github.com/thein-zaw-22/pw-e2e-fullstack/actions |
| AWS Console | https://console.aws.amazon.com |
| ECS Console | https://us-east-1.console.aws.amazon.com/ecs/v2/clusters/pw-e2e-cluster |
| RDS Console | https://us-east-1.console.aws.amazon.com/rds/home |
| ECR Console | https://us-east-1.console.aws.amazon.com/ecr/repositories |
| CloudWatch Logs | https://us-east-1.console.aws.amazon.com/cloudwatch/home#logsV2:log-groups |

### All CLI Commands Used

```bash
# --- AWS CLI ---

# Configure AWS credentials
aws configure

# Log in to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 067744549244.dkr.ecr.us-east-1.amazonaws.com

# Build and push Docker images
docker build --platform linux/amd64 -t 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/backend:latest ./backend
docker push 067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/backend:latest

# Run database migrations via ECS
aws ecs run-task --cluster pw-e2e-cluster --task-definition pw-e2e-qa-backend --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-07ecd231f80ef74ea,subnet-03a56b25c4680f3b4],securityGroups=[sg-07785c59afed94af2],assignPublicIp=DISABLED}" --overrides '{"containerOverrides":[{"name":"backend","command":["sh","-c","python manage.py migrate --noinput"]}]}'

# Force redeploy an ECS service
aws ecs update-service --cluster pw-e2e-cluster --service pw-e2e-qa-backend --force-new-deployment

# Check ECS service status
aws ecs describe-services --cluster pw-e2e-cluster --services pw-e2e-qa-backend pw-e2e-qa-frontend --query 'services[*].{name:serviceName,status:status,running:runningCount,desired:desiredCount}'

# Tail CloudWatch logs
aws logs tail /ecs/pw-e2e/qa/backend --since 1h --region us-east-1

# Set up infrastructure
chmod +x infra/setup-aws.sh && ./infra/setup-aws.sh

# Tear down infrastructure
chmod +x infra/teardown-aws.sh && ./infra/teardown-aws.sh

# --- Docker ---

# Build and run locally
docker compose up --build

# Stop local environment
docker compose down -v

# --- Playwright ---

# Install and run tests locally
cd tests/playwright-e2e
npm ci
npx playwright install --with-deps chromium
npx playwright test --project chromium

# Run only smoke tests
npx playwright test --project chromium --grep @smoke

# View last test report
npx playwright show-report
```

### GitHub Secrets Reference Table

| Secret Name | Scope | Value | Purpose |
|---|---|---|---|
| `AWS_ROLE_ARN` | Repository | `arn:aws:iam::067744549244:role/pw-e2e-github-actions` | OIDC authentication with AWS |
| `ECS_NETWORK_CONFIG` | Repository | `awsvpcConfiguration={subnets=[subnet-07ecd231f80ef74ea,subnet-03a56b25c4680f3b4],securityGroups=[sg-07785c59afed94af2],assignPublicIp=DISABLED}` | Network config for ECS run-task |
| `QA_URL` | qa environment | `http://pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com` | Playwright test target URL |
| `PROD_URL` | production environment | `http://pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com` | Playwright smoke test target URL |

### AWS Resource Names and IDs

| Resource | Name / ID |
|---|---|
| AWS Account ID | `067744549244` |
| Region | `us-east-1` |
| VPC | `vpc-02de94f0be8fac589` |
| Public Subnet 1 (us-east-1a) | `subnet-0a2a2fb650f102eae` |
| Public Subnet 2 (us-east-1b) | `subnet-05ba94fc1dc103c66` |
| Private Subnet 1 (us-east-1a) | `subnet-07ecd231f80ef74ea` |
| Private Subnet 2 (us-east-1b) | `subnet-03a56b25c4680f3b4` |
| ALB Security Group | `sg-0fae145f61dc4f131` |
| ECS Security Group | `sg-07785c59afed94af2` |
| RDS Security Group | `sg-01991da41352a738c` |
| ECS Cluster | `pw-e2e-cluster` |
| RDS Endpoint | `pw-e2e-db.c4dga0e4q44i.us-east-1.rds.amazonaws.com` |
| GitHub Actions IAM Role | `arn:aws:iam::067744549244:role/pw-e2e-github-actions` |
| ECR Backend Repo | `067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/backend` |
| ECR Frontend Repo | `067744549244.dkr.ecr.us-east-1.amazonaws.com/pw-e2e/frontend` |
| QA ALB DNS | `pw-e2e-qa-alb-1207067232.us-east-1.elb.amazonaws.com` |
| Prod ALB DNS | `pw-e2e-prod-alb-1265078818.us-east-1.elb.amazonaws.com` |
| QA Backend Service | `pw-e2e-qa-backend` |
| QA Frontend Service | `pw-e2e-qa-frontend` |
| Prod Backend Service | `pw-e2e-prod-backend` |
| Prod Frontend Service | `pw-e2e-prod-frontend` |
| QA Backend Task Def | `pw-e2e-qa-backend` |
| QA Frontend Task Def | `pw-e2e-qa-frontend` |
| Prod Backend Task Def | `pw-e2e-prod-backend` |
| Prod Frontend Task Def | `pw-e2e-prod-frontend` |
| CloudWatch Log Group (QA Backend) | `/ecs/pw-e2e/qa/backend` |
| CloudWatch Log Group (QA Frontend) | `/ecs/pw-e2e/qa/frontend` |
| CloudWatch Log Group (Prod Backend) | `/ecs/pw-e2e/prod/backend` |
| CloudWatch Log Group (Prod Frontend) | `/ecs/pw-e2e/prod/frontend` |
| Docker Hub | `theinzaw22` |

---

*This document was written for the pw-e2e-fullstack project. If you have
questions or find errors, open an issue on the GitHub repository.*
