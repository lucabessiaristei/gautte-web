import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

export const supabase = createClient<Database>(
    'https://rgiqoqmdffwtkwagnydf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaXFvcW1kZmZ3dGt3YWdueWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTc5NTAsImV4cCI6MjA5Mzg5Mzk1MH0.IudmcaA4AI6U1XyNRaJk5qkl_r1_r27e0a0pwqkZ-KI'
)