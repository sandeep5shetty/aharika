import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  integer,
  json,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  email: varchar("email", { length: 64 }).notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  name: text("name"),
  password: varchar("password", { length: 64 }),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  attachments: json("attachments").notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  parts: json("parts").notNull(),
  role: varchar("role").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    isUpvoted: boolean("isUpvoted").notNull(),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    content: text("content"),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    createdAt: timestamp("createdAt").notNull(),
    description: text("description"),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    documentId: uuid("documentId").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    isResolved: boolean("isResolved").notNull().default(false),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const foodSourceEnum = pgEnum("food_source", ["indb", "ifct"]);

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export const confidenceEnum = pgEnum("confidence_level", [
  "High",
  "Medium",
  "Low",
]);

export const foodItem = pgTable("FoodItem", {
  aliases: text("aliases").array().notNull().default([]),
  carbsG: doublePrecision("carbsG").notNull(),
  fatG: doublePrecision("fatG").notNull(),
  fiberG: doublePrecision("fiberG").notNull().default(0),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  kcalPer100g: doublePrecision("kcalPer100g").notNull(),
  name: text("name").notNull(),
  proteinG: doublePrecision("proteinG").notNull(),
  servingGrams: doublePrecision("servingGrams"),
  servingUnit: text("servingUnit"),
  source: foodSourceEnum("source").notNull(),
  sourceCode: varchar("sourceCode", { length: 64 }),
});

export type FoodItem = InferSelectModel<typeof foodItem>;

export const goal = pgTable("Goal", {
  calories: integer("calories").notNull(),
  carbsG: integer("carbsG").notNull(),
  fatG: integer("fatG").notNull(),
  fiberG: integer("fiberG").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  isDefault: boolean("isDefault").notNull().default(false),
  proteinG: integer("proteinG").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id)
    .unique(),
});

export type Goal = InferSelectModel<typeof goal>;

export const meal = pgTable("Meal", {
  calories: doublePrecision("calories").notNull(),
  carbsG: doublePrecision("carbsG").notNull(),
  chatId: uuid("chatId").references(() => chat.id, { onDelete: "set null" }),
  confidence: confidenceEnum("confidence").notNull(),
  fatG: doublePrecision("fatG").notNull(),
  fiberG: doublePrecision("fiberG").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  items: jsonb("items").notNull(),
  loggedAt: timestamp("loggedAt").notNull().defaultNow(),
  mealType: mealTypeEnum("mealType").notNull(),
  proteinG: doublePrecision("proteinG").notNull(),
  rawText: text("rawText").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type Meal = InferSelectModel<typeof meal>;

export const userMemorySummary = pgTable("UserMemorySummary", {
  generatedAt: timestamp("generatedAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  mealsSinceSummary: integer("mealsSinceSummary").notNull().default(0),
  summary: jsonb("summary").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id)
    .unique(),
});

export type UserMemorySummary = InferSelectModel<typeof userMemorySummary>;

export const nudge = pgTable(
  "Nudge",
  {
    date: varchar("date", { length: 10 }).notNull(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    mealType: mealTypeEnum("mealType").notNull(),
    sentAt: timestamp("sentAt").notNull().defaultNow(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    userMealDateUnique: unique().on(table.userId, table.mealType, table.date),
  })
);

export type Nudge = InferSelectModel<typeof nudge>;

export const userPreference = pgTable("UserPreference", {
  activity: varchar("activity", { length: 16 }),
  age: integer("age"),
  heightCm: doublePrecision("heightCm"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  sex: varchar("sex", { length: 8 }),
  timezone: varchar("timezone", { length: 64 })
    .notNull()
    .default("Asia/Kolkata"),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id)
    .unique(),
  weightKg: doublePrecision("weightKg"),
});

export type UserPreference = InferSelectModel<typeof userPreference>;

export const userFeedback = pgTable("UserFeedback", {
  category: varchar("category", { length: 32 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 64 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  message: text("message").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
});

export type UserFeedback = InferSelectModel<typeof userFeedback>;
