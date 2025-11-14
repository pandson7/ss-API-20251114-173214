# Product Specifications API - Architecture Diagrams

This directory contains AWS architecture diagrams generated for the Product Specifications API project.

## Generated Diagrams

### 1. Product API Architecture (`product-api-architecture.png`)
- **Purpose**: High-level system architecture overview
- **Components**: 
  - API Gateway (REST API endpoints)
  - Lambda Functions (getProducts, getProductById, initializeData)
  - DynamoDB Table (ProductSpecifications)
  - IAM Role for Lambda execution
  - CloudWatch for monitoring and logging
- **Flow**: Shows the request flow from client through API Gateway to Lambda functions and DynamoDB

### 2. Product API Detailed Data Flow (`product-api-detailed-flow.png`)
- **Purpose**: Detailed view of API endpoints and data flow
- **Components**:
  - Specific API Gateway endpoints (GET /products, GET /products/{id})
  - Individual Lambda functions with their specific roles
  - DynamoDB table structure with product records
  - Security and monitoring components
- **Flow**: Top-down view showing detailed request routing and data access patterns

### 3. Product API Deployment Architecture (`product-api-deployment.png`)
- **Purpose**: Infrastructure deployment and management view
- **Components**:
  - Developer workflow with AWS CDK
  - CloudFormation stack deployment
  - Complete infrastructure provisioning
  - Runtime connections and dependencies
- **Flow**: Left-to-right view showing deployment pipeline and infrastructure relationships

## Architecture Highlights

### API Design
- **REST API** with resource-based routing via API Gateway
- **Two main endpoints**:
  - `GET /products` - Retrieve all products
  - `GET /products/{id}` - Retrieve specific product by ID

### Compute Layer
- **AWS Lambda** functions using Node.js 18.x runtime
- **Serverless architecture** with automatic scaling
- **Function-specific roles** for security isolation

### Data Layer
- **DynamoDB** as primary data store
- **Product schema** with flexible specifications object
- **On-demand billing** mode for cost optimization

### Security & Monitoring
- **IAM roles** with least privilege access
- **CloudWatch** integration for logs and metrics
- **API Gateway** throttling and CORS configuration

### Infrastructure as Code
- **AWS CDK** for infrastructure definition
- **CloudFormation** for deployment automation
- **Consistent deployment** across environments

## Technical Specifications

- **Runtime**: Node.js 18.x
- **Database**: DynamoDB with product_id as primary key
- **API**: REST API with JSON responses
- **Monitoring**: CloudWatch Logs and Metrics
- **Security**: IAM roles with DynamoDB permissions
- **Deployment**: CDK + CloudFormation stack

## Sample Data Structure
The API includes 10+ sample products across categories:
- Electronics (headphones, smartphones, laptops)
- Clothing (shirts, shoes, accessories)  
- Home & Garden (furniture, tools, decor)
- Sports (equipment, apparel, accessories)

## Error Handling
- HTTP status codes: 200 (success), 404 (not found), 500 (server error)
- Structured error responses with error codes and messages
- Lambda function timeout: 30 seconds
- API Gateway throttling limits

Generated on: 2025-11-14T17:38:32.306-05:00
