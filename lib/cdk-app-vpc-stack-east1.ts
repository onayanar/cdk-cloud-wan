import { custom_resources as cr, Stack, StackProps } from 'aws-cdk-lib';
import { Vpc, VpcEndPoints } from './templates/vpc';
import { Ec2Instance } from './templates/ec2Instance'
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';


export class CdkCloudWanEast1Stack extends Stack {
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

    const cloudWanId = new cr.AwsCustomResource(this, 'CloudWanId-vpc-east1', {
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

    const prodVpc = new Vpc(this, "ProdVpc", {
      vpcName: "ProdVpc",
      "cidrRange": "10.11.0.0/16",
      "privatesubnets": [
        { name: "PrivateSubnet", cidrMask: 24 },
        { name: "TGWSubnet", cidrMask: 28 }
      ],
      destCidrBlock: "0.0.0.0/0",
      coreNetworkId: cloudWanId.getResponseField("Parameter.Value"),
      tagName: "env",
      tagValue: "prod"
    })

    const prodInstance = new Ec2Instance(this, "prodInstance", {
      "instanceName": "prodInstance",
      "vpc": prodVpc.vpc
    })

    const devVpc = new Vpc(this, "DevVpc", {
      vpcName: "DevVpc",
      "cidrRange": "10.1.0.0/16",
      "privatesubnets": [
        { name: "PrivateSubnet", cidrMask: 24 },
        { name: "TGWSubnet", cidrMask: 28 }
      ],
      destCidrBlock: "0.0.0.0/0",
      coreNetworkId: cloudWanId.getResponseField("Parameter.Value"),
      tagName: "env",
      tagValue: "dev",
      "endpoints": [VpcEndPoints.SSM]
    })

    const devInstance = new Ec2Instance(this, "devInstance", {
      "instanceName": "devInstance",
      "vpc": devVpc.vpc
    })

  }
}
