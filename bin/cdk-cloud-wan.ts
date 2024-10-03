#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkCloudWanEast1Stack } from '../lib/cdk-app-vpc-stack-east1';
import { CdkCloudWanEast2Stack } from '../lib/cdk-app-vpc-stack-east2';
import { CdkEgressVpcEast1Stack } from '../lib/cdk-egress-vpc-stack-east1';
import { CdkEgressVpcEast2Stack } from '../lib/cdk-egress-vpc-stack-east2';
import { CdkCloudWanNetworkStack } from '../lib/cloudwan-corenetwork-stack';

const app = new cdk.App();

new CdkCloudWanNetworkStack(app, 'CdkCloudWanNetworkStack', {
  env: {
    region: 'us-east-1',
  }
})

new CdkCloudWanEast1Stack(app, 'CdkCloudWanEast1Stack', {
    "env": {
        account: cdk.Aws.ACCOUNT_ID,
        region: "us-east-1"
    }
});
new CdkCloudWanEast2Stack(app, 'CdkCloudWanEast2Stack', { 
 "env": {
    account: cdk.Aws.ACCOUNT_ID,
    region: "us-east-2"
  }
});

new CdkEgressVpcEast1Stack(app, 'CdkEgressVpcEast1Stack', { 
  "env": {
     account: cdk.Aws.ACCOUNT_ID,
     region: "us-east-1"
   }
 });

 new CdkEgressVpcEast2Stack(app, 'CdkEgressVpcEast2Stack', { 
  "env": {
     account: cdk.Aws.ACCOUNT_ID,
     region: "us-east-2"
   }
 });