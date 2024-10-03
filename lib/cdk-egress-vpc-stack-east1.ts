import { custom_resources as cr, Stack, StackProps } from 'aws-cdk-lib';
import {Vpc} from './templates/vpc';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkEgressVpcEast1Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const ssmSdkCall: cr.AwsSdkCall = {
      service: 'SSM',
      action: 'getParameter',
      parameters: {
        Name: '/CoreNetwork/Id',
      },
      region: 'us-east-1',
      physicalResourceId: cr.PhysicalResourceId.of("useast1-cloudwan-id")
    };

    const cloudWanId = new cr.AwsCustomResource(this, 'CloudWanId-egress-east1', {
      onCreate: ssmSdkCall,
      onUpdate: ssmSdkCall,
      logRetention: logs.RetentionDays.FIVE_DAYS,
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['ssm:GetParameter'],
          effect: iam.Effect.ALLOW,
          resources: [`arn:aws:ssm:us-east-1:${Stack.of(this).account}:parameter/CoreNetwork/Id`],
        }),
      ]),
    });

    const egressVpc = new Vpc(this, "EgressVpc", {
      vpcName: "EgressVpc",
      cidrRange: "100.64.0.0/16",
      egresssubnets: [
        {name: "EgressSubnet", cidrMask: 24}, 
        {name: "EgressTGWSubnet", cidrMask: 28}
      ],
      publicsubnets: [ {name: "EgressPublicSubnet", cidrMask: 24}],
      destCidrBlock: "10.0.0.0/8",
      coreNetworkId: cloudWanId.getResponseField("Parameter.Value"),
      tagName: "env",
      tagValue: "services"
    })
  }
}
