import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as dynamodb from "@aws-cdk/aws-dynamodb";

export class TechsummitStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // defines an Amazon DynamoDB table resource named Trips
    const tmpTable = new dynamodb.Table(this, "Trips", {
      partitionKey: { name: "myPk", type: dynamodb.AttributeType.STRING },
      tableName: "tripsTemp",
      // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
      // the new table, and it will remain in your account until manually deleted. By setting the policy to
      // DESTROY, cdk destroy will delete the table (even if it has data in it)
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
    });
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // defines an AWS Lambda resource named trip-preferences
    const createTripPreferences = new lambda.Function(
      this,
      "TripPreferencesHandler",
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        code: lambda.Code.fromAsset("lambda"),
        handler: "trip-preferences.handler",
        environment: {
          TABLE_NAME: tmpTable.tableName,
          PRIMARY_KEY: "myPk",
        },
      }
    );

    // defines an AWS Lambda resource named get-trips
    const getTrips = new lambda.Function(this, "GetTripsHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "get-trips.handler",
      environment: {
        TABLE_NAME: tmpTable.tableName,
        PRIMARY_KEY: "myPk",
      },
    });

    // defines an AWS Lambda resource named trip-preferences
    const getTripDetails = new lambda.Function(this, "GetTripDetailsHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "get-trip-details.handler",
      environment: {
        TABLE_NAME: tmpTable.tableName,
        PRIMARY_KEY: "myPk",
      },
    });
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // defines the permissions that each Lambda will have over the DynamoDB table
    tmpTable.grantReadWriteData(createTripPreferences);
    tmpTable.grantReadWriteData(getTrips);
    tmpTable.grantReadWriteData(getTripDetails);
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // defines an API Gateway REST API resource backed by the lambda functions
    const apigw = new apigateway.RestApi(this, "tripsApi", {
      restApiName: "Trips Service",
    });

    // defines API Lambda Integrations for the API Gateway
    const trips = apigw.root.addResource("trips");
    const getAllTripsIntegration = new apigateway.LambdaIntegration(getTrips);
    trips.addMethod("GET", getAllTripsIntegration);

    const createTripPreferencesIntegration = new apigateway.LambdaIntegration(
      createTripPreferences
    );
    trips.addMethod("POST", createTripPreferencesIntegration);
    addCorsOptions(trips);

    const singleTrip = trips.addResource("{id}");
    const getSingleTripIntegration = new apigateway.LambdaIntegration(
      getTripDetails
    );
    singleTrip.addMethod("GET", getSingleTripIntegration);
  }
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
}



export function addCorsOptions(apiResource: apigateway.IResource) {
  apiResource.addMethod(
    "OPTIONS",
    new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Headers":
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
            "method.response.header.Access-Control-Allow-Origin": "'*'",
            "method.response.header.Access-Control-Allow-Credentials":
              "'false'",
            "method.response.header.Access-Control-Allow-Methods":
              "'OPTIONS,GET,PUT,POST,DELETE'",
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      requestTemplates: {
        "application/json": '{"statusCode": 200}',
      },
    }),
    {
      methodResponses: [
        {
          statusCode: "200",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Headers": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Credentials": true,
            "method.response.header.Access-Control-Allow-Origin": true,
          },
        },
      ],
    }
  );
}
