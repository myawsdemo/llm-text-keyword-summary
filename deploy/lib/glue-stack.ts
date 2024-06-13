import * as glue from '@aws-cdk/aws-glue-alpha';
import * as cdk from 'aws-cdk-lib';
import {NestedStack, CfnOutput} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as iam from "aws-cdk-lib/aws-iam";
import { Secret, SecretStringGenerator } from 'aws-cdk-lib/aws-secretsmanager';
import * as path from "path";
import {DeployConstant} from "./deploy-constants";

export class GlueStack extends NestedStack {

    jobArn = '';
    jobName = '';
    discordJobArn = '';
    discordJobName = '';
    /**
     *
     * @param {Construct} scope
     * @param {string} id
     * @param {StackProps=} props
     */
    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        const scriptPath = path.resolve(__dirname, '../resources/glue-job-code/llm-analysis-text.py');

        const job = new glue.Job(this, 'llm-analysis-text',{
            jobName: DeployConstant.GLUE_JOB_NAME,
            executable: glue.JobExecutable.pythonEtl({
                glueVersion: glue.GlueVersion.V4_0,
                pythonVersion: glue.PythonVersion.THREE,
                script: glue.Code.fromAsset(scriptPath),
            }),
            maxConcurrentRuns:200,
            maxRetries:0,
            defaultArguments:{
                '--BUCKET_NAME': DeployConstant.S3_BUCKET_NAME,
                '--RAW_DATA_PREFIX': DeployConstant.RAW_DATA_PREFIX,
                '--PROMPT_TEMPLATE_TABLE': DeployConstant.LLM_ANALYSIS_TEXT_TABLE_NAME,
                '--additional-python-modules': 'langchain==0.1.12,langchain-community==0.0.28,boto3>=1.34.64,botocore>=1.34.64'
            }
        })
        job.role.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: [
                    "s3:List*",
                    "s3:Put*",
                    "s3:Get*",
                    "dynamodb:*",
                    "bedrock:*",
                ],
                effect: iam.Effect.ALLOW,
                resources: ['*'],
            })
        )
        this.jobArn = job.jobArn;
        this.jobName = job.jobName;

        /** Discord collect data job */

        const secret = new Secret(this, 'MySecret', {
            secretName: 'discord-token',
            description: 'Discord Token',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ CHANNEL_ID: 123,  
                    TOKEN: ''}),
                generateStringKey: 'password',
              },
          });
      
        // 输出密钥的 ARN
        new CfnOutput(this, 'SecretArn', {
        value: secret.secretArn,
        description: 'Discord Secret ARN',
        });

        const discordScriptPath = path.resolve(__dirname, '../resources/glue-job-code/discord-message-collect.py');

        const discordJob = new glue.Job(this, 'glue-discord-job',{
            jobName: DeployConstant.GLUE_DISCORD_JOB_NAME,
            executable: glue.JobExecutable.pythonEtl({
                glueVersion: glue.GlueVersion.V4_0,
                pythonVersion: glue.PythonVersion.THREE,
                script: glue.Code.fromAsset(discordScriptPath),
            }),
            maxConcurrentRuns:200,
            maxRetries:0,
            defaultArguments:{
                '--BUCKET_NAME': DeployConstant.S3_BUCKET_NAME,
                '--RAW_DATA_PREFIX': DeployConstant.RAW_DATA_PREFIX,
                '--additional-python-modules': 'discord.py==2.3.2'
            }
        })
        discordJob.role.addToPrincipalPolicy(
            new iam.PolicyStatement({
                actions: [
                    "s3:List*",
                    "s3:Put*",
                    "s3:Get*",
                    "secretsmanager:GetSecretValue",
                ],
                effect: iam.Effect.ALLOW,
                resources: ['*'],
            })
        )
        this.discordJobArn = discordJob.jobArn;
        this.discordJobName = discordJob.jobName;

    }

}
