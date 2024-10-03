import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface Ec2Props {
    vpc: ec2.IVpc,
    instanceName: string
}

export class Ec2Instance extends Construct {

    public readonly vpc: ec2.IVpc;

    constructor(scope: Construct, id: string, props: Ec2Props) {
        super(scope, id)

        const instance = new ec2.Instance(this, props.instanceName, {
            vpc: props.vpc,
            vpcSubnets: props.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                subnetFilters: [ec2.SubnetFilter.byCidrMask(24)]
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.latestAmazonLinux2023(),
            role: iam.Role.fromRoleArn(this, `${props.instanceName}-ssm-role`, "arn:aws:iam::981504956772:role/EC2RoleforS3andSSM"),
            instanceName: props.instanceName
          });

        instance.connections.allowFrom(ec2.Peer.anyIpv4(), ec2.Port.allIcmp(), 'allow ssh access from source ipv4 ip');

    }
}