# Product Specifications API - Detailed Pricing Analysis

## Executive Summary

This document provides a comprehensive cost analysis for the Product Specifications API solution built on AWS serverless architecture. The solution uses API Gateway, Lambda, and DynamoDB with on-demand pricing.

**Key Cost Drivers:**
- API Gateway REST API requests: $3.50 per million requests
- Lambda compute and requests: $0.20 per million requests + compute costs
- DynamoDB read/write operations and storage

## Architecture Overview

The solution consists of:
- **API Gateway**: REST API with 2 endpoints (`GET /products`, `GET /products/{id}`)
- **AWS Lambda**: 3 functions (getProducts, getProductById, initializeData)
- **DynamoDB**: Single table with on-demand billing

## Detailed Cost Analysis

### 1. Amazon API Gateway Pricing

**Unit Pricing:**
- First 333 million requests: $3.50 per million requests
- Next 667 million requests: $2.80 per million requests
- Over 1 billion requests: $2.38 per million requests

### 2. AWS Lambda Pricing

**Request Pricing:**
- $0.20 per million requests

**Compute Pricing (x86 architecture):**
- First 6 billion GB-seconds: $0.0000166667 per GB-second
- Next 9 billion GB-seconds: $0.0000150000 per GB-second
- Over 15 billion GB-seconds: $0.0000133334 per GB-second

**Function Configuration:**
- Memory: 512 MB (0.5 GB)
- Average execution time: 200ms (0.2 seconds)
- GB-seconds per request: 0.5 GB × 0.2s = 0.1 GB-seconds

### 3. Amazon DynamoDB Pricing

**Request Pricing:**
- Read requests: $0.125 per million read request units
- Write requests: $0.625 per million write request units

**Storage Pricing:**
- First 25 GB: Free
- Beyond 25 GB: $0.25 per GB-month

## Cost Scenarios

### Scenario 1: Low Usage (10,000 API requests/month)

**API Gateway:**
- 10,000 requests × $3.50/1M = $0.035

**Lambda:**
- Requests: 20,000 invocations (2 functions per API call) × $0.20/1M = $0.004
- Compute: 20,000 × 0.1 GB-seconds × $0.0000166667 = $0.033
- Total Lambda: $0.037

**DynamoDB:**
- Read requests: 8,000 (80% of API calls) × $0.125/1M = $0.001
- Write requests: 2,000 (20% of API calls) × $0.625/1M = $0.001
- Storage: 1 GB (within free tier) = $0.00
- Total DynamoDB: $0.002

**Total Monthly Cost: $0.074 (~$0.07)**

### Scenario 2: Medium Usage (100,000 API requests/month)

**API Gateway:**
- 100,000 requests × $3.50/1M = $0.35

**Lambda:**
- Requests: 200,000 invocations × $0.20/1M = $0.04
- Compute: 200,000 × 0.1 GB-seconds × $0.0000166667 = $0.333
- Total Lambda: $0.373

**DynamoDB:**
- Read requests: 80,000 × $0.125/1M = $0.01
- Write requests: 20,000 × $0.625/1M = $0.0125
- Storage: 5 GB (within free tier) = $0.00
- Total DynamoDB: $0.0225

**Total Monthly Cost: $0.746 (~$0.75)**

### Scenario 3: High Usage (1,000,000 API requests/month)

**API Gateway:**
- 1,000,000 requests × $3.50/1M = $3.50

**Lambda:**
- Requests: 2,000,000 invocations × $0.20/1M = $0.40
- Compute: 2,000,000 × 0.1 GB-seconds × $0.0000166667 = $3.33
- Total Lambda: $3.73

**DynamoDB:**
- Read requests: 800,000 × $0.125/1M = $0.10
- Write requests: 200,000 × $0.625/1M = $0.125
- Storage: 50 GB = (50-25) × $0.25 = $6.25
- Total DynamoDB: $6.475

**Total Monthly Cost: $13.705 (~$13.71)**

## Cost Summary Table

| Usage Level | API Requests/Month | API Gateway | Lambda | DynamoDB | **Total** |
|-------------|-------------------|-------------|---------|----------|-----------|
| Low         | 10,000            | $0.04       | $0.04   | $0.00    | **$0.08** |
| Medium      | 100,000           | $0.35       | $0.37   | $0.02    | **$0.74** |
| High        | 1,000,000         | $3.50       | $3.73   | $6.48    | **$13.71** |

## Cost Optimization Recommendations

### Immediate Actions

1. **Consider API Gateway HTTP API**: Switch from REST API to HTTP API for ~70% cost savings on API requests
   - HTTP API pricing: $1.00 per million requests (vs $3.50 for REST API)
   - Potential savings: $2.50 per million requests

2. **Implement API Gateway Caching**: Cache frequently accessed product data
   - 0.5GB cache: $0.02/hour = $14.40/month
   - Can reduce Lambda invocations by 60-80% for read operations

3. **Optimize Lambda Memory**: Test with lower memory allocations
   - 256MB could reduce compute costs by 50% if performance is acceptable
   - Monitor execution time to ensure it doesn't increase significantly

### Long-term Optimizations

1. **DynamoDB Reserved Capacity**: For predictable workloads
   - Can provide 53-76% savings over on-demand pricing
   - Requires 1-year commitment

2. **Lambda ARM Architecture**: 20% cost savings on compute
   - Graviton2 processors offer better price-performance
   - Requires testing for compatibility

3. **Batch Operations**: Implement batch reads/writes for bulk operations
   - Reduces the number of DynamoDB requests
   - More efficient for data initialization and bulk updates

## Monitoring and Alerting

### Recommended CloudWatch Alarms

1. **API Gateway Request Count**: Alert when requests exceed expected thresholds
2. **Lambda Duration**: Monitor for performance degradation
3. **DynamoDB Consumed Capacity**: Track read/write capacity usage
4. **Monthly Cost**: Set billing alerts for cost thresholds

### Key Metrics to Track

- API Gateway 4xx/5xx error rates
- Lambda cold start frequency
- DynamoDB throttling events
- Average response times

## Assumptions and Limitations

### Assumptions
- Standard ON DEMAND pricing (no reserved capacity)
- API Gateway REST API (not HTTP API)
- Lambda x86 architecture with 512MB memory
- Average execution time of 200ms per Lambda function
- 80% read operations, 20% write operations for DynamoDB
- No caching enabled initially

### Excluded Costs
- Data transfer between regions
- CloudWatch logs and monitoring
- Custom domain names and SSL certificates
- Development and deployment costs
- DynamoDB backup and restore operations
- Lambda cold start optimization features

## Conclusion

The Product Specifications API offers a cost-effective serverless solution that scales with usage. For typical workloads:

- **Small applications** (10K requests/month): ~$0.08/month
- **Medium applications** (100K requests/month): ~$0.74/month  
- **Large applications** (1M requests/month): ~$13.71/month

The primary cost optimization opportunity is switching to API Gateway HTTP API, which could reduce costs by approximately 50% for API Gateway charges. Regular monitoring and optimization based on actual usage patterns will ensure continued cost efficiency.
