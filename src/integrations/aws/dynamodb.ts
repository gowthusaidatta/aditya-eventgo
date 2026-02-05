import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Table names
export const TABLES = {
  USERS: import.meta.env.VITE_DYNAMODB_USERS_TABLE,
  EVENTS: import.meta.env.VITE_DYNAMODB_EVENTS_TABLE,
  OPPORTUNITIES: import.meta.env.VITE_DYNAMODB_OPPORTUNITIES_TABLE,
};

// User Operations
export const UserService = {
  async getUser(userId: string) {
    try {
      const command = new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId },
      });
      const response = await docClient.send(command);
      return response.Item;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  },

  async createUser(userId: string, userData: any) {
    try {
      const command = new PutCommand({
        TableName: TABLES.USERS,
        Item: {
          userId,
          ...userData,
          createdAt: new Date().toISOString(),
        },
      });
      await docClient.send(command);
      return { userId, ...userData };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  async updateUser(userId: string, updates: any) {
    try {
      const updateExpression = Object.keys(updates)
        .map((key, index) => `${key} = :val${index}`)
        .join(", ");
      const expressionAttributeValues = Object.values(updates).reduce(
        (acc, val, index) => {
          acc[`:val${index}`] = val;
          return acc;
        },
        {} as Record<string, any>
      );

      const command = new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });
      const response = await docClient.send(command);
      return response.Attributes;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  async deleteUser(userId: string) {
    try {
      const command = new DeleteCommand({
        TableName: TABLES.USERS,
        Key: { userId },
      });
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
};

// Event Operations
export const EventService = {
  async getEvent(eventId: string) {
    try {
      const command = new GetCommand({
        TableName: TABLES.EVENTS,
        Key: { eventId },
      });
      const response = await docClient.send(command);
      return response.Item;
    } catch (error) {
      console.error("Error getting event:", error);
      throw error;
    }
  },

  async getAllEvents() {
    try {
      const command = new ScanCommand({
        TableName: TABLES.EVENTS,
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error("Error scanning events:", error);
      throw error;
    }
  },

  async getEventsByCreator(createdBy: string) {
    try {
      const command = new QueryCommand({
        TableName: TABLES.EVENTS,
        IndexName: "createdByIndex", // Requires GSI setup in DynamoDB
        KeyConditionExpression: "createdBy = :createdBy",
        ExpressionAttributeValues: {
          ":createdBy": createdBy,
        },
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error("Error querying events by creator:", error);
      throw error;
    }
  },

  async createEvent(eventId: string, eventData: any) {
    try {
      const command = new PutCommand({
        TableName: TABLES.EVENTS,
        Item: {
          eventId,
          ...eventData,
          createdAt: new Date().toISOString(),
        },
      });
      await docClient.send(command);
      return { eventId, ...eventData };
    } catch (error) {
      console.error("Error creating event:", error);
      throw error;
    }
  },

  async updateEvent(eventId: string, updates: any) {
    try {
      const updateExpression = Object.keys(updates)
        .map((key, index) => `${key} = :val${index}`)
        .join(", ");
      const expressionAttributeValues = Object.values(updates).reduce(
        (acc, val, index) => {
          acc[`:val${index}`] = val;
          return acc;
        },
        {} as Record<string, any>
      );

      const command = new UpdateCommand({
        TableName: TABLES.EVENTS,
        Key: { eventId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });
      const response = await docClient.send(command);
      return response.Attributes;
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  },

  async deleteEvent(eventId: string) {
    try {
      const command = new DeleteCommand({
        TableName: TABLES.EVENTS,
        Key: { eventId },
      });
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  },
};

// Opportunities Operations
export const OpportunityService = {
  async getOpportunity(oppId: string) {
    try {
      const command = new GetCommand({
        TableName: TABLES.OPPORTUNITIES,
        Key: { oppId },
      });
      const response = await docClient.send(command);
      return response.Item;
    } catch (error) {
      console.error("Error getting opportunity:", error);
      throw error;
    }
  },

  async getAllOpportunities() {
    try {
      const command = new ScanCommand({
        TableName: TABLES.OPPORTUNITIES,
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error("Error scanning opportunities:", error);
      throw error;
    }
  },

  async getOpportunitiesByType(type: "job" | "internship") {
    try {
      const command = new ScanCommand({
        TableName: TABLES.OPPORTUNITIES,
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: { ":type": type },
      });
      const response = await docClient.send(command);
      return response.Items || [];
    } catch (error) {
      console.error("Error getting opportunities by type:", error);
      throw error;
    }
  },

  async createOpportunity(oppId: string, oppData: any) {
    try {
      const command = new PutCommand({
        TableName: TABLES.OPPORTUNITIES,
        Item: {
          oppId,
          ...oppData,
          createdAt: new Date().toISOString(),
        },
      });
      await docClient.send(command);
      return { oppId, ...oppData };
    } catch (error) {
      console.error("Error creating opportunity:", error);
      throw error;
    }
  },

  async updateOpportunity(oppId: string, updates: any) {
    try {
      const updateExpression = Object.keys(updates)
        .map((key, index) => `${key} = :val${index}`)
        .join(", ");
      const expressionAttributeValues = Object.values(updates).reduce(
        (acc, val, index) => {
          acc[`:val${index}`] = val;
          return acc;
        },
        {} as Record<string, any>
      );

      const command = new UpdateCommand({
        TableName: TABLES.OPPORTUNITIES,
        Key: { oppId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
      });
      const response = await docClient.send(command);
      return response.Attributes;
    } catch (error) {
      console.error("Error updating opportunity:", error);
      throw error;
    }
  },

  async deleteOpportunity(oppId: string) {
    try {
      const command = new DeleteCommand({
        TableName: TABLES.OPPORTUNITIES,
        Key: { oppId },
      });
      await docClient.send(command);
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      throw error;
    }
  },
};
