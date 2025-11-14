"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSpecificationsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
class ProductSpecificationsStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Extract suffix from project folder name
        const suffix = '20251114173214';
        // DynamoDB Table
        const productsTable = new dynamodb.Table(this, `ProductSpecifications${suffix}`, {
            tableName: `ProductSpecifications${suffix}`,
            partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        // Enable auto scaling
        productsTable.autoScaleReadCapacity({
            minCapacity: 1,
            maxCapacity: 10
        });
        productsTable.autoScaleWriteCapacity({
            minCapacity: 1,
            maxCapacity: 10
        });
        // Lambda Functions
        const getAllProductsFunction = new lambda.Function(this, `GetAllProducts${suffix}`, {
            functionName: `GetAllProducts${suffix}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: process.env.TABLE_NAME
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        products: result.Items || [],
        count: result.Count || 0
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve products'
        }
      })
    };
  }
};
      `),
            environment: {
                TABLE_NAME: productsTable.tableName
            }
        });
        const getProductByIdFunction = new lambda.Function(this, `GetProductById${suffix}`, {
            functionName: `GetProductById${suffix}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const productId = event.pathParameters?.id;
    
    if (!productId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Product ID is required'
          }
        })
      };
    }

    const result = await docClient.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { product_id: productId }
    }));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: \`Product with ID '\${productId}' not found\`
          }
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve product'
        }
      })
    };
  }
};
      `),
            environment: {
                TABLE_NAME: productsTable.tableName
            }
        });
        const initializeDataFunction = new lambda.Function(this, `InitializeData${suffix}`, {
            functionName: `InitializeData${suffix}`,
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            timeout: cdk.Duration.seconds(60),
            code: lambda.Code.fromInline(`
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const sampleProducts = [
  {
    product_id: 'prod-001',
    name: 'Wireless Bluetooth Headphones',
    category: 'Electronics',
    brand: 'TechSound',
    specifications: {
      color: 'Black',
      battery_life: '20 hours',
      connectivity: 'Bluetooth 5.0',
      noise_cancellation: true,
      weight: '250g'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-002',
    name: 'Smartphone Pro Max',
    category: 'Electronics',
    brand: 'MobileTech',
    specifications: {
      screen_size: '6.7 inches',
      storage: '256GB',
      camera: '48MP',
      battery: '4000mAh',
      color: 'Space Gray'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-003',
    name: 'Cotton T-Shirt',
    category: 'Clothing',
    brand: 'ComfortWear',
    specifications: {
      material: '100% Cotton',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['White', 'Black', 'Navy'],
      care: 'Machine wash cold'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-004',
    name: 'Running Shoes',
    category: 'Sports',
    brand: 'SportFlex',
    specifications: {
      type: 'Running',
      sole_material: 'Rubber',
      upper_material: 'Mesh',
      sizes: [7, 8, 9, 10, 11, 12],
      weight: '300g'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-005',
    name: 'Coffee Maker',
    category: 'Home & Kitchen',
    brand: 'BrewMaster',
    specifications: {
      capacity: '12 cups',
      type: 'Drip',
      programmable: true,
      auto_shutoff: '2 hours',
      dimensions: '14x10x12 inches'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-006',
    name: 'Laptop Backpack',
    category: 'Accessories',
    brand: 'TravelGear',
    specifications: {
      laptop_size: 'Up to 15.6 inches',
      material: 'Water-resistant nylon',
      compartments: 3,
      color: 'Black',
      warranty: '2 years'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-007',
    name: 'Yoga Mat',
    category: 'Sports',
    brand: 'FlexFit',
    specifications: {
      thickness: '6mm',
      material: 'TPE',
      dimensions: '72x24 inches',
      non_slip: true,
      eco_friendly: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-008',
    name: 'Desk Lamp',
    category: 'Home & Garden',
    brand: 'BrightLight',
    specifications: {
      type: 'LED',
      adjustable: true,
      brightness_levels: 5,
      color_temperature: '3000K-6500K',
      power: '12W'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-009',
    name: 'Gaming Mouse',
    category: 'Electronics',
    brand: 'GamePro',
    specifications: {
      dpi: '16000',
      buttons: 8,
      connectivity: 'USB',
      rgb_lighting: true,
      weight: '95g'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    product_id: 'prod-010',
    name: 'Water Bottle',
    category: 'Sports',
    brand: 'HydroFlow',
    specifications: {
      capacity: '750ml',
      material: 'Stainless Steel',
      insulated: true,
      temperature_retention: '24 hours cold, 12 hours hot',
      bpa_free: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

exports.handler = async (event) => {
  try {
    const chunks = [];
    for (let i = 0; i < sampleProducts.length; i += 25) {
      chunks.push(sampleProducts.slice(i, i + 25));
    }
    
    for (const chunk of chunks) {
      const putRequests = chunk.map(product => ({
        PutRequest: { Item: product }
      }));
      
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [process.env.TABLE_NAME]: putRequests
        }
      }));
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: \`Successfully initialized \${sampleProducts.length} sample products\`
      })
    };
  } catch (error) {
    console.error('Error initializing data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to initialize sample data',
        details: error.message
      })
    };
  }
};
      `),
            environment: {
                TABLE_NAME: productsTable.tableName
            }
        });
        // Grant DynamoDB permissions
        productsTable.grantReadData(getAllProductsFunction);
        productsTable.grantReadData(getProductByIdFunction);
        productsTable.grantWriteData(initializeDataFunction);
        // API Gateway
        const api = new apigateway.RestApi(this, `ProductSpecificationsApi${suffix}`, {
            restApiName: `ProductSpecificationsApi${suffix}`,
            description: 'API for accessing product specifications',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
            }
        });
        // API Resources and Methods
        const productsResource = api.root.addResource('products');
        productsResource.addMethod('GET', new apigateway.LambdaIntegration(getAllProductsFunction));
        const productByIdResource = productsResource.addResource('{id}');
        productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdFunction));
        // Outputs
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL'
        });
        new cdk.CfnOutput(this, 'TableName', {
            value: productsTable.tableName,
            description: 'DynamoDB Table Name'
        });
        new cdk.CfnOutput(this, 'InitializeFunctionName', {
            value: initializeDataFunction.functionName,
            description: 'Data Initialization Function Name'
        });
    }
}
exports.ProductSpecificationsStack = ProductSpecificationsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLWluZnJhc3RydWN0dXJlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2RrLWluZnJhc3RydWN0dXJlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsdUVBQXlEO0FBS3pELE1BQWEsMEJBQTJCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QiwwQ0FBMEM7UUFDMUMsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUM7UUFFaEMsaUJBQWlCO1FBQ2pCLE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLE1BQU0sRUFBRSxFQUFFO1lBQy9FLFNBQVMsRUFBRSx3QkFBd0IsTUFBTSxFQUFFO1lBQzNDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3pFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVc7WUFDN0MsWUFBWSxFQUFFLENBQUM7WUFDZixhQUFhLEVBQUUsQ0FBQztZQUNoQixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILHNCQUFzQjtRQUN0QixhQUFhLENBQUMscUJBQXFCLENBQUM7WUFDbEMsV0FBVyxFQUFFLENBQUM7WUFDZCxXQUFXLEVBQUUsRUFBRTtTQUNoQixDQUFDLENBQUM7UUFFSCxhQUFhLENBQUMsc0JBQXNCLENBQUM7WUFDbkMsV0FBVyxFQUFFLENBQUM7WUFDZCxXQUFXLEVBQUUsRUFBRTtTQUNoQixDQUFD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QUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRTFELGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBRTVGLE1BQU0sbUJBQW1CLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pFLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxVQUFVLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1FBRS9GLFVBQVU7UUFDVixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsaUJBQWlCO1NBQy9CLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxhQUFhLENBQUMsU0FBUztZQUM5QixXQUFXLEVBQUUscUJBQXFCO1NBQ25DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLHNCQUFzQixDQUFDLFlBQVk7WUFDMUMsV0FBVyxFQUFFLG1DQUFtQztTQUNqRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6WkQsZ0VBeVpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIFByb2R1Y3RTcGVjaWZpY2F0aW9uc1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gRXh0cmFjdCBzdWZmaXggZnJvbSBwcm9qZWN0IGZvbGRlciBuYW1lXG4gICAgY29uc3Qgc3VmZml4ID0gJzIwMjUxMTE0MTczMjE0JztcblxuICAgIC8vIER5bmFtb0RCIFRhYmxlXG4gICAgY29uc3QgcHJvZHVjdHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgUHJvZHVjdFNwZWNpZmljYXRpb25zJHtzdWZmaXh9YCwge1xuICAgICAgdGFibGVOYW1lOiBgUHJvZHVjdFNwZWNpZmljYXRpb25zJHtzdWZmaXh9YCxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvZHVjdF9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUFJPVklTSU9ORUQsXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXG4gICAgICB3cml0ZUNhcGFjaXR5OiA1LFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgIH0pO1xuXG4gICAgLy8gRW5hYmxlIGF1dG8gc2NhbGluZ1xuICAgIHByb2R1Y3RzVGFibGUuYXV0b1NjYWxlUmVhZENhcGFjaXR5KHtcbiAgICAgIG1pbkNhcGFjaXR5OiAxLFxuICAgICAgbWF4Q2FwYWNpdHk6IDEwXG4gICAgfSk7XG5cbiAgICBwcm9kdWN0c1RhYmxlLmF1dG9TY2FsZVdyaXRlQ2FwYWNpdHkoe1xuICAgICAgbWluQ2FwYWNpdHk6IDEsXG4gICAgICBtYXhDYXBhY2l0eTogMTBcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBGdW5jdGlvbnNcbiAgICBjb25zdCBnZXRBbGxQcm9kdWN0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBgR2V0QWxsUHJvZHVjdHMke3N1ZmZpeH1gLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBHZXRBbGxQcm9kdWN0cyR7c3VmZml4fWAsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxuY29uc3QgeyBEeW5hbW9EQkNsaWVudCB9ID0gcmVxdWlyZSgnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJyk7XG5jb25zdCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFNjYW5Db21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5UQUJMRV9OQU1FXG4gICAgfSkpO1xuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHByb2R1Y3RzOiByZXN1bHQuSXRlbXMgfHwgW10sXG4gICAgICAgIGNvdW50OiByZXN1bHQuQ291bnQgfHwgMFxuICAgICAgfSlcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjoge1xuICAgICAgICAgIGNvZGU6ICdJTlRFUk5BTF9FUlJPUicsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byByZXRyaWV2ZSBwcm9kdWN0cydcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9O1xuICB9XG59O1xuICAgICAgYCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBwcm9kdWN0c1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgZ2V0UHJvZHVjdEJ5SWRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgYEdldFByb2R1Y3RCeUlkJHtzdWZmaXh9YCwge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgR2V0UHJvZHVjdEJ5SWQke3N1ZmZpeH1gLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcbmNvbnN0IHsgRHluYW1vREJDbGllbnQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicpO1xuY29uc3QgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kIH0gPSByZXF1aXJlKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5leHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwcm9kdWN0SWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uaWQ7XG4gICAgXG4gICAgaWYgKCFwcm9kdWN0SWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJ1xuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX1BBUkFNRVRFUicsXG4gICAgICAgICAgICBtZXNzYWdlOiAnUHJvZHVjdCBJRCBpcyByZXF1aXJlZCdcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRSxcbiAgICAgIEtleTogeyBwcm9kdWN0X2lkOiBwcm9kdWN0SWQgfVxuICAgIH0pKTtcbiAgICBcbiAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICBjb2RlOiAnUFJPRFVDVF9OT1RfRk9VTkQnLFxuICAgICAgICAgICAgbWVzc2FnZTogXFxgUHJvZHVjdCB3aXRoIElEICdcXCR7cHJvZHVjdElkfScgbm90IGZvdW5kXFxgXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJ1xuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3VsdC5JdGVtKVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgY29kZTogJ0lOVEVSTkFMX0VSUk9SJyxcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHJldHJpZXZlIHByb2R1Y3QnXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfTtcbiAgfVxufTtcbiAgICAgIGApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVEFCTEVfTkFNRTogcHJvZHVjdHNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGluaXRpYWxpemVEYXRhRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIGBJbml0aWFsaXplRGF0YSR7c3VmZml4fWAsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogYEluaXRpYWxpemVEYXRhJHtzdWZmaXh9YCxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXG5jb25zdCB7IER5bmFtb0RCQ2xpZW50IH0gPSByZXF1aXJlKCdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInKTtcbmNvbnN0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgQmF0Y2hXcml0ZUNvbW1hbmQgfSA9IHJlcXVpcmUoJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicpO1xuXG5jb25zdCBjbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xuY29uc3QgZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XG5cbmNvbnN0IHNhbXBsZVByb2R1Y3RzID0gW1xuICB7XG4gICAgcHJvZHVjdF9pZDogJ3Byb2QtMDAxJyxcbiAgICBuYW1lOiAnV2lyZWxlc3MgQmx1ZXRvb3RoIEhlYWRwaG9uZXMnLFxuICAgIGNhdGVnb3J5OiAnRWxlY3Ryb25pY3MnLFxuICAgIGJyYW5kOiAnVGVjaFNvdW5kJyxcbiAgICBzcGVjaWZpY2F0aW9uczoge1xuICAgICAgY29sb3I6ICdCbGFjaycsXG4gICAgICBiYXR0ZXJ5X2xpZmU6ICcyMCBob3VycycsXG4gICAgICBjb25uZWN0aXZpdHk6ICdCbHVldG9vdGggNS4wJyxcbiAgICAgIG5vaXNlX2NhbmNlbGxhdGlvbjogdHJ1ZSxcbiAgICAgIHdlaWdodDogJzI1MGcnXG4gICAgfSxcbiAgICBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgdXBkYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gIH0sXG4gIHtcbiAgICBwcm9kdWN0X2lkOiAncHJvZC0wMDInLFxuICAgIG5hbWU6ICdTbWFydHBob25lIFBybyBNYXgnLFxuICAgIGNhdGVnb3J5OiAnRWxlY3Ryb25pY3MnLFxuICAgIGJyYW5kOiAnTW9iaWxlVGVjaCcsXG4gICAgc3BlY2lmaWNhdGlvbnM6IHtcbiAgICAgIHNjcmVlbl9zaXplOiAnNi43IGluY2hlcycsXG4gICAgICBzdG9yYWdlOiAnMjU2R0InLFxuICAgICAgY2FtZXJhOiAnNDhNUCcsXG4gICAgICBiYXR0ZXJ5OiAnNDAwMG1BaCcsXG4gICAgICBjb2xvcjogJ1NwYWNlIEdyYXknXG4gICAgfSxcbiAgICBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgdXBkYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gIH0sXG4gIHtcbiAgICBwcm9kdWN0X2lkOiAncHJvZC0wMDMnLFxuICAgIG5hbWU6ICdDb3R0b24gVC1TaGlydCcsXG4gICAgY2F0ZWdvcnk6ICdDbG90aGluZycsXG4gICAgYnJhbmQ6ICdDb21mb3J0V2VhcicsXG4gICAgc3BlY2lmaWNhdGlvbnM6IHtcbiAgICAgIG1hdGVyaWFsOiAnMTAwJSBDb3R0b24nLFxuICAgICAgc2l6ZXM6IFsnUycsICdNJywgJ0wnLCAnWEwnXSxcbiAgICAgIGNvbG9yczogWydXaGl0ZScsICdCbGFjaycsICdOYXZ5J10sXG4gICAgICBjYXJlOiAnTWFjaGluZSB3YXNoIGNvbGQnXG4gICAgfSxcbiAgICBjcmVhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgdXBkYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gIH0sXG4gIHtcbiAgICBwcm9kdWN0X2lkOiAncHJvZC0wMDQnLFxuICAgIG5hbWU6ICdSdW5uaW5nIFNob2VzJyxcbiAgICBjYXRlZ29yeTogJ1Nwb3J0cycsXG4gICAgYnJhbmQ6ICdTcG9ydEZsZXgnLFxuICAgIHNwZWNpZmljYXRpb25zOiB7XG4gICAgICB0eXBlOiAnUnVubmluZycsXG4gICAgICBzb2xlX21hdGVyaWFsOiAnUnViYmVyJyxcbiAgICAgIHVwcGVyX21hdGVyaWFsOiAnTWVzaCcsXG4gICAgICBzaXplczogWzcsIDgsIDksIDEwLCAxMSwgMTJdLFxuICAgICAgd2VpZ2h0OiAnMzAwZydcbiAgICB9LFxuICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgfSxcbiAge1xuICAgIHByb2R1Y3RfaWQ6ICdwcm9kLTAwNScsXG4gICAgbmFtZTogJ0NvZmZlZSBNYWtlcicsXG4gICAgY2F0ZWdvcnk6ICdIb21lICYgS2l0Y2hlbicsXG4gICAgYnJhbmQ6ICdCcmV3TWFzdGVyJyxcbiAgICBzcGVjaWZpY2F0aW9uczoge1xuICAgICAgY2FwYWNpdHk6ICcxMiBjdXBzJyxcbiAgICAgIHR5cGU6ICdEcmlwJyxcbiAgICAgIHByb2dyYW1tYWJsZTogdHJ1ZSxcbiAgICAgIGF1dG9fc2h1dG9mZjogJzIgaG91cnMnLFxuICAgICAgZGltZW5zaW9uczogJzE0eDEweDEyIGluY2hlcydcbiAgICB9LFxuICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgfSxcbiAge1xuICAgIHByb2R1Y3RfaWQ6ICdwcm9kLTAwNicsXG4gICAgbmFtZTogJ0xhcHRvcCBCYWNrcGFjaycsXG4gICAgY2F0ZWdvcnk6ICdBY2Nlc3NvcmllcycsXG4gICAgYnJhbmQ6ICdUcmF2ZWxHZWFyJyxcbiAgICBzcGVjaWZpY2F0aW9uczoge1xuICAgICAgbGFwdG9wX3NpemU6ICdVcCB0byAxNS42IGluY2hlcycsXG4gICAgICBtYXRlcmlhbDogJ1dhdGVyLXJlc2lzdGFudCBueWxvbicsXG4gICAgICBjb21wYXJ0bWVudHM6IDMsXG4gICAgICBjb2xvcjogJ0JsYWNrJyxcbiAgICAgIHdhcnJhbnR5OiAnMiB5ZWFycydcbiAgICB9LFxuICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgfSxcbiAge1xuICAgIHByb2R1Y3RfaWQ6ICdwcm9kLTAwNycsXG4gICAgbmFtZTogJ1lvZ2EgTWF0JyxcbiAgICBjYXRlZ29yeTogJ1Nwb3J0cycsXG4gICAgYnJhbmQ6ICdGbGV4Rml0JyxcbiAgICBzcGVjaWZpY2F0aW9uczoge1xuICAgICAgdGhpY2tuZXNzOiAnNm1tJyxcbiAgICAgIG1hdGVyaWFsOiAnVFBFJyxcbiAgICAgIGRpbWVuc2lvbnM6ICc3MngyNCBpbmNoZXMnLFxuICAgICAgbm9uX3NsaXA6IHRydWUsXG4gICAgICBlY29fZnJpZW5kbHk6IHRydWVcbiAgICB9LFxuICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgfSxcbiAge1xuICAgIHByb2R1Y3RfaWQ6ICdwcm9kLTAwOCcsXG4gICAgbmFtZTogJ0Rlc2sgTGFtcCcsXG4gICAgY2F0ZWdvcnk6ICdIb21lICYgR2FyZGVuJyxcbiAgICBicmFuZDogJ0JyaWdodExpZ2h0JyxcbiAgICBzcGVjaWZpY2F0aW9uczoge1xuICAgICAgdHlwZTogJ0xFRCcsXG4gICAgICBhZGp1c3RhYmxlOiB0cnVlLFxuICAgICAgYnJpZ2h0bmVzc19sZXZlbHM6IDUsXG4gICAgICBjb2xvcl90ZW1wZXJhdHVyZTogJzMwMDBLLTY1MDBLJyxcbiAgICAgIHBvd2VyOiAnMTJXJ1xuICAgIH0sXG4gICAgY3JlYXRlZF9hdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIHVwZGF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICB9LFxuICB7XG4gICAgcHJvZHVjdF9pZDogJ3Byb2QtMDA5JyxcbiAgICBuYW1lOiAnR2FtaW5nIE1vdXNlJyxcbiAgICBjYXRlZ29yeTogJ0VsZWN0cm9uaWNzJyxcbiAgICBicmFuZDogJ0dhbWVQcm8nLFxuICAgIHNwZWNpZmljYXRpb25zOiB7XG4gICAgICBkcGk6ICcxNjAwMCcsXG4gICAgICBidXR0b25zOiA4LFxuICAgICAgY29ubmVjdGl2aXR5OiAnVVNCJyxcbiAgICAgIHJnYl9saWdodGluZzogdHJ1ZSxcbiAgICAgIHdlaWdodDogJzk1ZydcbiAgICB9LFxuICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgfSxcbiAge1xuICAgIHByb2R1Y3RfaWQ6ICdwcm9kLTAxMCcsXG4gICAgbmFtZTogJ1dhdGVyIEJvdHRsZScsXG4gICAgY2F0ZWdvcnk6ICdTcG9ydHMnLFxuICAgIGJyYW5kOiAnSHlkcm9GbG93JyxcbiAgICBzcGVjaWZpY2F0aW9uczoge1xuICAgICAgY2FwYWNpdHk6ICc3NTBtbCcsXG4gICAgICBtYXRlcmlhbDogJ1N0YWlubGVzcyBTdGVlbCcsXG4gICAgICBpbnN1bGF0ZWQ6IHRydWUsXG4gICAgICB0ZW1wZXJhdHVyZV9yZXRlbnRpb246ICcyNCBob3VycyBjb2xkLCAxMiBob3VycyBob3QnLFxuICAgICAgYnBhX2ZyZWU6IHRydWVcbiAgICB9LFxuICAgIGNyZWF0ZWRfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB1cGRhdGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgfVxuXTtcblxuZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XG4gIHRyeSB7XG4gICAgY29uc3QgY2h1bmtzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzYW1wbGVQcm9kdWN0cy5sZW5ndGg7IGkgKz0gMjUpIHtcbiAgICAgIGNodW5rcy5wdXNoKHNhbXBsZVByb2R1Y3RzLnNsaWNlKGksIGkgKyAyNSkpO1xuICAgIH1cbiAgICBcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgY29uc3QgcHV0UmVxdWVzdHMgPSBjaHVuay5tYXAocHJvZHVjdCA9PiAoe1xuICAgICAgICBQdXRSZXF1ZXN0OiB7IEl0ZW06IHByb2R1Y3QgfVxuICAgICAgfSkpO1xuICAgICAgXG4gICAgICBhd2FpdCBkb2NDbGllbnQuc2VuZChuZXcgQmF0Y2hXcml0ZUNvbW1hbmQoe1xuICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICBbcHJvY2Vzcy5lbnYuVEFCTEVfTkFNRV06IHB1dFJlcXVlc3RzXG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbWVzc2FnZTogXFxgU3VjY2Vzc2Z1bGx5IGluaXRpYWxpemVkIFxcJHtzYW1wbGVQcm9kdWN0cy5sZW5ndGh9IHNhbXBsZSBwcm9kdWN0c1xcYFxuICAgICAgfSlcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluaXRpYWxpemluZyBkYXRhOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBpbml0aWFsaXplIHNhbXBsZSBkYXRhJyxcbiAgICAgICAgZGV0YWlsczogZXJyb3IubWVzc2FnZVxuICAgICAgfSlcbiAgICB9O1xuICB9XG59O1xuICAgICAgYCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBUQUJMRV9OQU1FOiBwcm9kdWN0c1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgRHluYW1vREIgcGVybWlzc2lvbnNcbiAgICBwcm9kdWN0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0QWxsUHJvZHVjdHNGdW5jdGlvbik7XG4gICAgcHJvZHVjdHNUYWJsZS5ncmFudFJlYWREYXRhKGdldFByb2R1Y3RCeUlkRnVuY3Rpb24pO1xuICAgIHByb2R1Y3RzVGFibGUuZ3JhbnRXcml0ZURhdGEoaW5pdGlhbGl6ZURhdGFGdW5jdGlvbik7XG5cbiAgICAvLyBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgYFByb2R1Y3RTcGVjaWZpY2F0aW9uc0FwaSR7c3VmZml4fWAsIHtcbiAgICAgIHJlc3RBcGlOYW1lOiBgUHJvZHVjdFNwZWNpZmljYXRpb25zQXBpJHtzdWZmaXh9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBhY2Nlc3NpbmcgcHJvZHVjdCBzcGVjaWZpY2F0aW9ucycsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ1gtQW16LURhdGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFwaS1LZXknXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gQVBJIFJlc291cmNlcyBhbmQgTWV0aG9kc1xuICAgIGNvbnN0IHByb2R1Y3RzUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncHJvZHVjdHMnKTtcbiAgICBcbiAgICBwcm9kdWN0c1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0QWxsUHJvZHVjdHNGdW5jdGlvbikpO1xuICAgIFxuICAgIGNvbnN0IHByb2R1Y3RCeUlkUmVzb3VyY2UgPSBwcm9kdWN0c1Jlc291cmNlLmFkZFJlc291cmNlKCd7aWR9Jyk7XG4gICAgcHJvZHVjdEJ5SWRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGdldFByb2R1Y3RCeUlkRnVuY3Rpb24pKTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogcHJvZHVjdHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIFRhYmxlIE5hbWUnXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSW5pdGlhbGl6ZUZ1bmN0aW9uTmFtZScsIHtcbiAgICAgIHZhbHVlOiBpbml0aWFsaXplRGF0YUZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YSBJbml0aWFsaXphdGlvbiBGdW5jdGlvbiBOYW1lJ1xuICAgIH0pO1xuICB9XG59XG4iXX0=