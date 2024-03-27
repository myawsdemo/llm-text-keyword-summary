import * as cdk from 'aws-cdk-lib';
import {NestedStack} from 'aws-cdk-lib';
import * as lambdanodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Construct} from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import {DeployConstant} from "./deploy-constants";

export class LambdaStack extends NestedStack {

    public readonly submitJobFunction: lambda.IFunction;
    public readonly promptTemplateFunction: lambda.IFunction;

    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        const submitJobLambdaRole = new iam.Role(this, 'ApigLambdaRole', {
            roleName: `submit-job-lambda--${cdk.Stack.of(this).region}`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
            ],
            inlinePolicies: {
                'GlueFullAccess': new iam.PolicyDocument({
                    assignSids: true,
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                'glue:*'
                            ],
                            resources: [
                                '*'
                            ]
                        })
                    ]
                })
            }
        });

        const promptTemplateLambdaRole = new iam.Role(this, 'PromptTemplateLambdaRole', {
            roleName: `prompt-template-lambda--${cdk.Stack.of(this).region}`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
            ],
        });

        const functionSettings : lambdanodejs.NodejsFunctionProps = {
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_LATEST,
            memorySize: 128,
            timeout: cdk.Duration.seconds(60),
            architecture: cdk.aws_lambda.Architecture.X86_64,
            logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
        }

        this.submitJobFunction = new lambdanodejs.NodejsFunction(this, 'SubmitGlueJob', {
            functionName: 'submit-glue-job-func',
            entry: './resources/lambda/submit-analysis-glue-job.ts',
            role: submitJobLambdaRole,
            environment: {
                'GLUE_JOB_NAME': DeployConstant.GLUE_JOB_NAME,
            },
            ...functionSettings
        });

        this.promptTemplateFunction = new lambdanodejs.NodejsFunction(this, 'PromptTemplateFunction', {
            functionName: 'prompt-template-func',
            entry: './resources/lambda/prompt-template-function.ts',
            role: promptTemplateLambdaRole,
            environment: {
                'TABLE_NAME': DeployConstant.LLM_ANALYSIS_TEXT_TABLE_NAME,
            },
            ...functionSettings
        });
    }

}
