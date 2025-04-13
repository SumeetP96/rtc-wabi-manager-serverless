import { relations } from "drizzle-orm/relations";
import { groups, campaigns, templates, customerGroups, customers, messages, messageQueue } from "./schema";

export const campaignsRelations = relations(campaigns, ({one, many}) => ({
	group: one(groups, {
		fields: [campaigns.groupId],
		references: [groups.id]
	}),
	template: one(templates, {
		fields: [campaigns.templateId],
		references: [templates.id]
	}),
	messageQueues: many(messageQueue),
}));

export const groupsRelations = relations(groups, ({many}) => ({
	campaigns: many(campaigns),
	customerGroups: many(customerGroups),
	messageQueues: many(messageQueue),
}));

export const templatesRelations = relations(templates, ({many}) => ({
	campaigns: many(campaigns),
	messages: many(messages),
	messageQueues: many(messageQueue),
}));

export const customerGroupsRelations = relations(customerGroups, ({one}) => ({
	group: one(groups, {
		fields: [customerGroups.groupId],
		references: [groups.id]
	}),
	customer: one(customers, {
		fields: [customerGroups.customerId],
		references: [customers.id]
	}),
}));

export const customersRelations = relations(customers, ({many}) => ({
	customerGroups: many(customerGroups),
	messages: many(messages),
	messageQueues: many(messageQueue),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	template: one(templates, {
		fields: [messages.templateId],
		references: [templates.id]
	}),
	customer: one(customers, {
		fields: [messages.customerId],
		references: [customers.id]
	}),
	messageQueues: many(messageQueue),
}));

export const messageQueueRelations = relations(messageQueue, ({one}) => ({
	campaign: one(campaigns, {
		fields: [messageQueue.campaignId],
		references: [campaigns.id]
	}),
	group: one(groups, {
		fields: [messageQueue.groupId],
		references: [groups.id]
	}),
	message: one(messages, {
		fields: [messageQueue.messageId],
		references: [messages.id]
	}),
	template: one(templates, {
		fields: [messageQueue.templateId],
		references: [templates.id]
	}),
	customer: one(customers, {
		fields: [messageQueue.customerId],
		references: [customers.id]
	}),
}));