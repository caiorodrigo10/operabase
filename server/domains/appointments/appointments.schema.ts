
import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  contact_id: integer("contact_id").notNull(),
  clinic_id: integer("clinic_id").notNull(),
  user_id: integer("user_id").notNull(), // Required: user who created/owns the appointment
  doctor_name: text("doctor_name"),
  specialty: text("specialty"),
  appointment_type: text("appointment_type"), // primeira_consulta, retorno, avaliacao, emergencia
  scheduled_date: timestamp("scheduled_date"),
  duration_minutes: integer("duration_minutes").default(60),
  status: text("status").notNull(), // agendada, confirmada, paciente_aguardando, paciente_em_atendimento, finalizada, faltou, cancelada_paciente, cancelada_dentista
  cancellation_reason: text("cancellation_reason"),
  session_notes: text("session_notes"),
  payment_status: text("payment_status").default("pendente"),
  payment_amount: integer("payment_amount"),
  google_calendar_event_id: text("google_calendar_event_id"),
  tag_id: integer("tag_id"), // Reference to appointment_tags table
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Critical multi-tenant composite indexes for high performance
  index("idx_appointments_clinic_date").on(table.clinic_id, table.scheduled_date),
  index("idx_appointments_clinic_status").on(table.clinic_id, table.status),
  index("idx_appointments_clinic_user").on(table.clinic_id, table.user_id),
  index("idx_appointments_contact_clinic").on(table.contact_id, table.clinic_id),
  index("idx_appointments_clinic_updated").on(table.clinic_id, table.updated_at),
  // Existing single-column indexes
  index("idx_appointments_user").on(table.user_id),
  index("idx_appointments_contact").on(table.contact_id),
  index("idx_appointments_clinic").on(table.clinic_id),
]);

export const insertAppointmentSchema = createInsertSchema(appointments);

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
