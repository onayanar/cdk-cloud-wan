import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import {CloudWan} from './templates/cloudwan';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export class CdkCloudWanNetworkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    let cloudWanPolicy: string;
    if (fs.existsSync(path.join(__dirname, "core-network-active-policy.json"))) {
        cloudWanPolicy = path.join(__dirname, "core-network-active-policy.json")// "core-network-active-policy.json"
    } else {
        cloudWanPolicy = path.join(__dirname, "core-network-initial-policy.json") //"core-network-initial-policy.json"
    }
   
    const cloudwan = new CloudWan(this, "demowan", {
        globalnetworkName: "demowan",
        policyFile: cloudWanPolicy
    })

    new CfnOutput(this, 'corenetworkArn', {
        value: cloudwan.coreNetworkArn,
        description: 'Core Network Arn',
        exportName: 'coreNetworkArn'
      });

  }
}