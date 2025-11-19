import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Client Configuration
 * 
 * This file provides a singleton Supabase client instance.
 * For client-side usage, use NEXT_PUBLIC_ prefixed environment variables.
 * For server-side usage, use regular environment variables.
 */

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Validate configuration
if (!supabaseUrl) {
  throw new Error(
    'Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your environment variables.'
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing Supabase Anon Key. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in your environment variables.'
  )
}

// Create Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Type definition for Todo items
 */
export interface Todo {
  id: string
  title: string
  description?: string
  completed: boolean
  created_at?: string
  updated_at?: string
  user_id?: string
  [key: string]: any // Allow additional fields
}

/**
 * Fetch all todos from Supabase
 * 
 * @returns Promise with todos data and error
 */
export async function getTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select()

  if (error) {
    console.error('Error fetching todos:', error)
    throw error
  }

  return { data, error: null }
}

/**
 * Fetch todos with optional filters
 * 
 * @param filters - Optional filters to apply
 * @returns Promise with filtered todos data and error
 */
export async function getTodosWithFilters(filters?: {
  completed?: boolean
  userId?: string
  limit?: number
  orderBy?: string
  ascending?: boolean
}) {
  let query = supabase.from('todos').select()

  if (filters?.completed !== undefined) {
    query = query.eq('completed', filters.completed)
  }

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  }

  if (filters?.orderBy) {
    query = query.order(filters.orderBy, { ascending: filters.ascending ?? true })
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching todos with filters:', error)
    throw error
  }

  return { data, error: null }
}

/**
 * Create a new todo
 * 
 * @param todo - Todo data to create
 * @returns Promise with created todo data and error
 */
export async function createTodo(todo: Omit<Todo, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('todos')
    .insert([todo])
    .select()
    .single()

  if (error) {
    console.error('Error creating todo:', error)
    throw error
  }

  return { data, error: null }
}

/**
 * Update an existing todo
 * 
 * @param id - Todo ID to update
 * @param updates - Partial todo data to update
 * @returns Promise with updated todo data and error
 */
export async function updateTodo(id: string, updates: Partial<Todo>) {
  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating todo:', error)
    throw error
  }

  return { data, error: null }
}

/**
 * Delete a todo
 * 
 * @param id - Todo ID to delete
 * @returns Promise with deletion result and error
 */
export async function deleteTodo(id: string) {
  const { data, error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error deleting todo:', error)
    throw error
  }

  return { data, error: null }
}

/**
 * Example usage:
 * 
 * // Basic fetch
 * const { data, error } = await getTodos()
 * 
 * // With filters
 * const { data, error } = await getTodosWithFilters({
 *   completed: false,
 *   userId: 'user-123',
 *   limit: 10,
 *   orderBy: 'created_at',
 *   ascending: false
 * })
 * 
 * // Create todo
 * const { data, error } = await createTodo({
 *   title: 'New Todo',
 *   description: 'Todo description',
 *   completed: false,
 *   user_id: 'user-123'
 * })
 * 
 * // Update todo
 * const { data, error } = await updateTodo('todo-id', {
 *   completed: true
 * })
 * 
 * // Delete todo
 * const { data, error } = await deleteTodo('todo-id')
 */

