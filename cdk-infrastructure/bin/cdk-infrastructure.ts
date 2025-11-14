#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductSpecificationsStack } from '../lib/cdk-infrastructure-stack';

const app = new cdk.App();
new ProductSpecificationsStack(app, 'ProductSpecificationsStack20251114173214', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});
