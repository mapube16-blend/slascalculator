const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const TABLES = {
  PROJECTS: process.env.DYNAMO_PROJECTS_TABLE || 'sla-reporter-projects',
  TEAMS: process.env.DYNAMO_TEAMS_TABLE || 'sla-reporter-teams'
};

module.exports = { dynamodb, TABLES };
