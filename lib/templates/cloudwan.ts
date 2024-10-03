import { Construct } from 'constructs';
import * as fs from 'fs';
import { aws_networkmanager as networkmanager } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';


export interface CloudWanProps {
    globalnetworkName: string,
    policyFile: string
}

export class CloudWan extends Construct {

    public readonly coreNetworkArn: string

    constructor(scope: Construct, id: string, props: CloudWanProps) {
        super(scope, id)
        
    const cfnGlobalNetwork = new networkmanager.CfnGlobalNetwork(this, props.globalnetworkName, {
        description: 'demo cloud wan',
        tags: [{
        key: 'owner',
        value: 'cloudadmin',
        },
        { key: 'Name', value:  props.globalnetworkName}
        ],
    });
    

    const cloudWanPolicy = JSON.parse(fs.readFileSync(props.policyFile).toString());

    const cfnCoreNetwork = new networkmanager.CfnCoreNetwork(this, 'Core-Network', {

        globalNetworkId: cfnGlobalNetwork.attrId,

        description: 'Core Network',
        policyDocument: cloudWanPolicy,
        tags: [{
          key: 'Name',
          value: 'Core Network'
        }],
      });

      this.coreNetworkArn = cfnCoreNetwork.attrCoreNetworkArn;

      const useast1CorenetworkId = new ssm.StringParameter(this, 'ClouWanCoreNetworkId', {
        description: 'Core Network Id',
        parameterName: '/CoreNetwork/Id',
        stringValue: cfnCoreNetwork.attrCoreNetworkId,
        tier: ssm.ParameterTier.STANDARD
      });
    }
}
