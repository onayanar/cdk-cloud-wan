import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { aws_networkmanager as networkmanager } from 'aws-cdk-lib';

export enum VpcEndPoints {
    ECR,
    SSM,
    APIGW,
    STS,
    LAMBDA,
    DYNAMODB,
    S3,
    EC2,
    ELB,
    CLOUDWATCH,
    EKS,
    SECRETSMGR,
    STEPFUNCTIONS,
    XRAY
}

export interface VpcProps {
    cidrRange: string,
    vpcName: string,
    privatesubnets?: {name: string, cidrMask: number}[],
    publicsubnets?: {name: string, cidrMask: number}[],
    egresssubnets?: {name: string, cidrMask: number}[],
    destCidrBlock: string,
    endpoints?: VpcEndPoints[],
    coreNetworkId: string,
    tagName: string,
    tagValue: string
}

let VpcEndpointMap = new Map<VpcEndPoints, ec2.InterfaceVpcEndpointAwsService[]>([
    [VpcEndPoints.ECR, [ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER]],
    [VpcEndPoints.APIGW, [ec2.InterfaceVpcEndpointAwsService.APIGATEWAY]],
    [VpcEndPoints.SSM, [ec2.InterfaceVpcEndpointAwsService.SSM, ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES, ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES]],
    [VpcEndPoints.CLOUDWATCH, [ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS, ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING]],
    [VpcEndPoints.EC2, [ec2.InterfaceVpcEndpointAwsService.EC2]],
    [VpcEndPoints.EKS, [ec2.InterfaceVpcEndpointAwsService.EKS, ec2.InterfaceVpcEndpointAwsService.EKS_AUTH]],
    [VpcEndPoints.ELB, [ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING]],
    [VpcEndPoints.LAMBDA, [ec2.InterfaceVpcEndpointAwsService.LAMBDA]],
    [VpcEndPoints.SECRETSMGR, [ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER]],
    [VpcEndPoints.STEPFUNCTIONS, [ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS, ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS_SYNC]],
    [VpcEndPoints.XRAY, [ec2.InterfaceVpcEndpointAwsService.XRAY]]
]);

export class Vpc extends Construct {

    public readonly vpc: ec2.IVpc;
    public readonly interfaceEndpoints: Map<VpcEndPoints, ec2.InterfaceVpcEndpoint>;

    constructor(scope: Construct, id: string, props: VpcProps) {
        super(scope, id)

        const subnetsConfig: { cidrMask: number; name: string; subnetType: cdk.aws_ec2.SubnetType; }[] = []

        props.privatesubnets?.forEach(subnet => {
            subnetsConfig.push({
                cidrMask: subnet.cidrMask,
                name: subnet.name,
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED
            })
       })

       props.publicsubnets?.forEach(subnet => {
        subnetsConfig.push({
            cidrMask: subnet.cidrMask,
            name: subnet.name,
            subnetType: ec2.SubnetType.PUBLIC
        })
       })

       props.egresssubnets?.forEach(subnet => {
        subnetsConfig.push({
            cidrMask: subnet.cidrMask,
            name: subnet.name,
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        })
       })

        const vpc = new ec2.Vpc(this, props.vpcName, {
            ipAddresses: ec2.IpAddresses.cidr(props.cidrRange),
            vpcName: props.vpcName,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            maxAzs: 2,
            subnetConfiguration: subnetsConfig
            
        })

        this.vpc = vpc
        let interfaceEndpoints = new Map<VpcEndPoints, ec2.InterfaceVpcEndpoint>()

        props.endpoints?.forEach((endpoint: VpcEndPoints) => {

            if (endpoint === VpcEndPoints.S3) {

                const dynamoDbEndpoint = vpc.addGatewayEndpoint('S3Endpoint', {
                    service: ec2.GatewayVpcEndpointAwsService.S3,
                });

            } else if (endpoint === VpcEndPoints.DYNAMODB) {

                const dynamoDbEndpoint = vpc.addGatewayEndpoint('DynamoDbEndpoint', {
                    service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
                });

            } else {

                let awsInterfaceEndPoints = VpcEndpointMap.get(endpoint)
                awsInterfaceEndPoints?.forEach((awsEndpoint: ec2.InterfaceVpcEndpointAwsService, index) => {
                    interfaceEndpoints.set(endpoint,vpc.addInterfaceEndpoint(`Endpoint${index}`, {
                        service: awsEndpoint,
                        privateDnsEnabled: true,
                        open: true
                    }));
                })
            }
        })

        const cfnVpcAttachment = new networkmanager.CfnVpcAttachment(this, `${props.vpcName}-CfnVpcAttachment`, {
            coreNetworkId: props.coreNetworkId,
            subnetArns: vpc.selectSubnets({
                //subnetType: ec2.SubnetType.PRIVATE_ISOLATED || ec2.SubnetType.PRIVATE_WITH_EGRESS,
                subnetFilters: [ec2.SubnetFilter.byCidrMask(28)]
            }).subnets.map(subnet => `arn:aws:ec2:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:subnet/${subnet.subnetId}`),
            vpcArn: vpc.vpcArn,
            options: {
              applianceModeSupport: true,
              ipv6Support: false,
            },
            tags: [{
              key: props.tagName,
              value: props.tagValue
            }]
          });

          vpc.isolatedSubnets.forEach((subnet, index) => {
            const cfnRoute = new ec2.CfnRoute(this, `${props.vpcName}-private-attachment${index}`, {
               routeTableId: subnet.routeTable.routeTableId,
               destinationCidrBlock: props.destCidrBlock,
               coreNetworkArn: `arn:aws:networkmanager::${cdk.Stack.of(this).account}:core-network/${props.coreNetworkId}`
           });
           cfnRoute.addDependency(cfnVpcAttachment);
         });

          vpc.privateSubnets.forEach((subnet, index) => {
             const cfnRoute = new ec2.CfnRoute(this, `${props.vpcName}-private-attachment${index}`, {
                routeTableId: subnet.routeTable.routeTableId,
                destinationCidrBlock: props.destCidrBlock,
                coreNetworkArn:  `arn:aws:networkmanager::${cdk.Stack.of(this).account}:core-network/${props.coreNetworkId}`
            });
            cfnRoute.addDependency(cfnVpcAttachment);
          });

          vpc.publicSubnets.forEach((subnet, index) => {
            const cfnRoute = new ec2.CfnRoute(this, `${props.vpcName}-public-attachment${index}`, {
               routeTableId: subnet.routeTable.routeTableId,
               destinationCidrBlock: props.destCidrBlock,
               coreNetworkArn:  `arn:aws:networkmanager::${cdk.Stack.of(this).account}:core-network/${props.coreNetworkId}`
           });
           cfnRoute.addDependency(cfnVpcAttachment);
         });

        this.interfaceEndpoints = interfaceEndpoints
    }
}