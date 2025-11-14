# Product Specifications API

A complete AWS-based Product Specifications API built with AWS CDK, providing access to product data stored in DynamoDB with flexible JSON schema support.

## 🚀 Features

- **RESTful API** with AWS API Gateway
- **DynamoDB** for scalable data storage
- **Lambda Functions** for serverless compute
- **Flexible JSON Schema** for product specifications
- **Auto-scaling** DynamoDB configuration
- **CORS Support** for web applications
- **Comprehensive Error Handling**
- **CloudWatch Logging**

## 📋 API Endpoints

### Base URL
```
https://c759xy44h8.execute-api.us-east-1.amazonaws.com/prod/
```

### Endpoints

#### GET /products
Returns all products with count
```bash
curl https://c759xy44h8.execute-api.us-east-1.amazonaws.com/prod/products
```

#### GET /products/{id}
Returns specific product by ID
```bash
curl https://c759xy44h8.execute-api.us-east-1.amazonaws.com/prod/products/prod-001
```

## 🏗️ Architecture

- **API Gateway**: REST API with CORS enabled
- **Lambda Functions**: Node.js 22.x runtime
- **DynamoDB**: NoSQL database with auto-scaling
- **IAM Roles**: Least privilege access control
- **CloudWatch**: Logging and monitoring

## 📁 Project Structure

```
ss-API-20251114-173214/
├── cdk-infrastructure/          # CDK infrastructure code
│   ├── lib/                    # Stack definitions
│   ├── bin/                    # CDK app entry point
│   ├── test/                   # Unit tests
│   └── package.json            # Dependencies
├── generated-diagrams/         # Architecture diagrams
├── pricing/                    # Cost analysis
├── specs/                      # Requirements and design
├── qr-code/                    # QR code for quick access
└── README.md                   # This file
```

## 🛠️ Deployment

The infrastructure is deployed using AWS CDK:

```bash
cd cdk-infrastructure
npm install
cdk deploy
```

## 📊 Sample Data

The API includes 10 diverse sample products across categories:
- Electronics (Headphones, Smartphone, Gaming Mouse)
- Clothing (Cotton T-Shirt)
- Sports (Running Shoes, Yoga Mat, Water Bottle)
- Home & Kitchen (Coffee Maker)
- Home & Garden (Desk Lamp)
- Accessories (Laptop Backpack)

## 🔧 AWS Resources

- **DynamoDB Table**: `ProductSpecifications20251114173214`
- **Lambda Functions**:
  - `GetAllProducts20251114173214`
  - `GetProductById20251114173214`
  - `InitializeData20251114173214`
- **API Gateway**: `ProductSpecificationsApi20251114173214`

## 📈 Performance

- Single product retrieval: <500ms
- All products retrieval: <2s
- Auto-scaling: 1-10 capacity units
- Concurrent request handling

## 🔒 Security

- IAM roles with least privilege access
- CORS configuration for web security
- Input validation and sanitization
- Structured error responses

## 📝 Documentation

- [Requirements](specs/requirements.md)
- [Design Document](specs/design.md)
- [Task Breakdown](specs/tasks.md)
- [Pricing Analysis](pricing/pricing_analysis.md)
- [Project Summary](PROJECT_SUMMARY.md)

## 🎯 Status

✅ **COMPLETE** - All requirements implemented and validated

## 📞 Support

For questions or issues, please refer to the project documentation or contact the development team.
