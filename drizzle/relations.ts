import { relations } from "drizzle-orm/relations";
import { groups, campaigns, templates, customerGroups, customers, messageQueue, messages } from "./schema";

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
	messageQueues: many(messageQueue),
	messages: many(messages),
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
	messageQueues: many(messageQueue),
	messages: many(messages),
}));

export const messageQueueRelations = relations(messageQueue, ({one}) => ({
	group: one(groups, {
		fields: [messageQueue.groupId],
		references: [groups.id]
	}),
	campaign: one(campaigns, {
		fields: [messageQueue.campaignId],
		references: [campaigns.id]
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

export const messagesRelations = relations(messages, ({one}) => ({
	template: one(templates, {
		fields: [messages.templateId],
		references: [templates.id]
	}),
	customer: one(customers, {
		fields: [messages.customerId],
		references: [customers.id]
	}),
}));