// =====================================================================
// StudyFlow - Initialisation MongoDB Atlas
// Base : studyflow
// À exécuter dans le shell MongoDB :
//   mongosh "mongodb://localhost:27017/studyflow" \
//           --file init-mongo.js
// =====================================================================

const dbName = "studyflow";
db = db.getSiblingDB(dbName);

// ---------- COLLECTION : chat_rooms ----------
db.createCollection("chat_rooms", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["groupId", "createdAt", "isActive"],
      properties: {
        groupId:   { bsonType: "string", description: "UUID du StudyGroup PostgreSQL" },
        createdAt: { bsonType: "date" },
        isActive:  { bsonType: "bool" }
      }
    }
  }
});
db.chat_rooms.createIndex({ groupId: 1 }, { unique: true });

// ---------- COLLECTION : chat_messages ----------
db.createCollection("chat_messages", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["roomId", "senderId", "content", "sentAt"],
      properties: {
        roomId:    { bsonType: "objectId" },
        senderId:  { bsonType: "string", description: "UUID utilisateur" },
        content:   { bsonType: "string" },
        sentAt:    { bsonType: "date" },
        isEdited:  { bsonType: "bool" },
        editedAt:  { bsonType: ["date", "null"] },
        isDeleted: { bsonType: "bool" }
      }
    }
  }
});
db.chat_messages.createIndex({ roomId: 1, sentAt: -1 });
db.chat_messages.createIndex({ senderId: 1 });

// ---------- COLLECTION : notifications ----------
db.createCollection("notifications", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "type", "message", "isRead", "createdAt"],
      properties: {
        userId:    { bsonType: "string" },
        type:      { enum: ["SESSION_REMINDER", "GROUP_INVITATION", "GOAL_ACHIEVED", "NEW_MESSAGE", "SESSION_SHARED"] },
        message:   { bsonType: "string" },
        isRead:    { bsonType: "bool" },
        createdAt: { bsonType: "date" },
        metadata:  { bsonType: "object" }
      }
    }
  }
});
db.notifications.createIndex({ userId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1 });

// ---------- COLLECTION : comments ----------
db.createCollection("comments", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["sessionId", "authorId", "content", "createdAt"],
      properties: {
        sessionId: { bsonType: "string", description: "UUID StudySession" },
        authorId:  { bsonType: "string", description: "UUID User" },
        content:   { bsonType: "string" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: ["date", "null"] },
        isEdited:  { bsonType: "bool" }
      }
    }
  }
});
db.comments.createIndex({ sessionId: 1, createdAt: -1 });
db.comments.createIndex({ authorId: 1 });

// ---------- COLLECTION : productivity_stats ----------
db.createCollection("productivity_stats", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "weekStart", "weekEnd"],
      properties: {
        userId:                { bsonType: "string" },
        weekStart:             { bsonType: "date" },
        weekEnd:               { bsonType: "date" },
        totalPlannedMinutes:   { bsonType: "int" },
        totalActualMinutes:    { bsonType: "int" },
        completionRate:        { bsonType: "double" },
        sessionsCount:         { bsonType: "int" },
        subjectBreakdown:      { bsonType: "object", description: "{ subjectId: minutes }" },
        createdAt:             { bsonType: "date" }
      }
    }
  }
});
db.productivity_stats.createIndex({ userId: 1, weekStart: -1 }, { unique: true });

// ---------------------------------------------------------------------
// DONNÉES DE TEST
// ---------------------------------------------------------------------
const groupId = "bbbb1111-1111-1111-1111-111111111111";
const userAsmae = "22222222-2222-2222-2222-222222222222";
const userYoussef = "33333333-3333-3333-3333-333333333333";

// chat_room pour le groupe Java Spring Boot 2026
const chatRoom = db.chat_rooms.insertOne({
  groupId: groupId,
  createdAt: new Date(),
  isActive: true
});

const roomId = chatRoom.insertedId;

// Messages d'exemple
db.chat_messages.insertMany([
  { roomId: roomId, senderId: userAsmae,   content: "Salut ! Je commence Spring Security demain.", sentAt: new Date(), isEdited: false, isDeleted: false },
  { roomId: roomId, senderId: userYoussef, content: "Cool, on peut faire un point ce weekend ?",  sentAt: new Date(), isEdited: false, isDeleted: false }
]);

// Notification de démo
db.notifications.insertOne({
  userId: userAsmae,
  type: "GOAL_ACHIEVED",
  message: "Bravo, vous avez atteint 80% de votre objectif hebdomadaire !",
  isRead: false,
  createdAt: new Date(),
  metadata: { progress: 0.8 }
});

print("StudyFlow MongoDB initialisé avec succès.");
print("Collections : " + db.getCollectionNames().join(", "));
