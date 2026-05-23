import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { CheckCircle2, ListTodo, Info } from 'lucide-react'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let todos: any[] | null = null;
  let error: any = null;

  try {
    const { data, error: fetchError } = await supabase.from('todos').select();
    todos = data;
    error = fetchError;
  } catch (err: any) {
    error = err;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-card/5 to-background py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-card border border-border/40 shadow-2xl rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-8 border-b border-border/30 pb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Supabase Test Todos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Fetching data directly from your Supabase instance using SSR.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20 mb-6">
            <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Supabase Fetch Error</p>
              <p className="text-xs opacity-90">{error.message || String(error)}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {!todos || todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border/60 rounded-2xl bg-muted/20">
              <CheckCircle2 className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No todos found in the database.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs text-center">
                Make sure you have a <code className="px-1.5 py-0.5 bg-muted rounded font-mono">todos</code> table with <code className="px-1.5 py-0.5 bg-muted rounded font-mono">id</code> and <code className="px-1.5 py-0.5 bg-muted rounded font-mono">name</code> columns.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/20 border border-border/40 rounded-2xl overflow-hidden bg-muted/5">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/10 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {todo.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground/75">
          <span>Supabase SSR Client Helper</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Connected to Supabase
          </span>
        </div>
      </div>
    </main>
  )
}
