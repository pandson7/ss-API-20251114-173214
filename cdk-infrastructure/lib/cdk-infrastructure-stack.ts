import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class ProductSpecificationsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
