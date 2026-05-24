export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agency: {
        Row: {
          agency_email: string | null
          agency_fare_url: string | null
          agency_id: string
          agency_lang: string | null
          agency_name: string | null
          agency_phone: string | null
          agency_timezone: string | null
          agency_url: string | null
        }
        Insert: {
          agency_email?: string | null
          agency_fare_url?: string | null
          agency_id: string
          agency_lang?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          agency_timezone?: string | null
          agency_url?: string | null
        }
        Update: {
          agency_email?: string | null
          agency_fare_url?: string | null
          agency_id?: string
          agency_lang?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          agency_timezone?: string | null
          agency_url?: string | null
        }
        Relationships: []
      }
      calendar: {
        Row: {
          end_date: string | null
          friday: string | null
          monday: string | null
          saturday: string | null
          service_id: string
          start_date: string | null
          sunday: string | null
          thursday: string | null
          tuesday: string | null
          wednesday: string | null
        }
        Insert: {
          end_date?: string | null
          friday?: string | null
          monday?: string | null
          saturday?: string | null
          service_id: string
          start_date?: string | null
          sunday?: string | null
          thursday?: string | null
          tuesday?: string | null
          wednesday?: string | null
        }
        Update: {
          end_date?: string | null
          friday?: string | null
          monday?: string | null
          saturday?: string | null
          service_id?: string
          start_date?: string | null
          sunday?: string | null
          thursday?: string | null
          tuesday?: string | null
          wednesday?: string | null
        }
        Relationships: []
      }
      calendar_dates: {
        Row: {
          date: string | null
          exception_type: string | null
          service_id: string | null
        }
        Insert: {
          date?: string | null
          exception_type?: string | null
          service_id?: string | null
        }
        Update: {
          date?: string | null
          exception_type?: string | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_dates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "calendar"
            referencedColumns: ["service_id"]
          },
        ]
      }
      feed_info: {
        Row: {
          feed_contact_email: string | null
          feed_contact_url: string | null
          feed_end_date: string | null
          feed_lang: string | null
          feed_publisher_name: string | null
          feed_publisher_url: string | null
          feed_start_date: string | null
          feed_version: string | null
        }
        Insert: {
          feed_contact_email?: string | null
          feed_contact_url?: string | null
          feed_end_date?: string | null
          feed_lang?: string | null
          feed_publisher_name?: string | null
          feed_publisher_url?: string | null
          feed_start_date?: string | null
          feed_version?: string | null
        }
        Update: {
          feed_contact_email?: string | null
          feed_contact_url?: string | null
          feed_end_date?: string | null
          feed_lang?: string | null
          feed_publisher_name?: string | null
          feed_publisher_url?: string | null
          feed_start_date?: string | null
          feed_version?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          agency_id: string | null
          route_color: string | null
          route_desc: string | null
          route_id: string
          route_long_name: string | null
          route_short_name: string | null
          route_sort_order: number | null
          route_text_color: string | null
          route_type: number | null
          route_url: string | null
        }
        Insert: {
          agency_id?: string | null
          route_color?: string | null
          route_desc?: string | null
          route_id: string
          route_long_name?: string | null
          route_short_name?: string | null
          route_sort_order?: number | null
          route_text_color?: string | null
          route_type?: number | null
          route_url?: string | null
        }
        Update: {
          agency_id?: string | null
          route_color?: string | null
          route_desc?: string | null
          route_id?: string
          route_long_name?: string | null
          route_short_name?: string | null
          route_sort_order?: number | null
          route_text_color?: string | null
          route_type?: number | null
          route_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency"
            referencedColumns: ["agency_id"]
          },
        ]
      }
      shapes: {
        Row: {
          shape_id: string
          shape_pt_lat: number | null
          shape_pt_lon: number | null
          shape_pt_sequence: number
        }
        Insert: {
          shape_id: string
          shape_pt_lat?: number | null
          shape_pt_lon?: number | null
          shape_pt_sequence: number
        }
        Update: {
          shape_id?: string
          shape_pt_lat?: number | null
          shape_pt_lon?: number | null
          shape_pt_sequence?: number
        }
        Relationships: []
      }
      stop_attributes: {
        Row: {
          stop_city: string | null
          stop_id: string | null
        }
        Insert: {
          stop_city?: string | null
          stop_id?: string | null
        }
        Update: {
          stop_city?: string | null
          stop_id?: string | null
        }
        Relationships: []
      }
      stop_times: {
        Row: {
          arrival_time: string | null
          departure_time: string | null
          drop_off_type: string | null
          pickup_type: string | null
          shape_dist_traveled: string | null
          stop_headsign: string | null
          stop_id: string | null
          stop_sequence: number | null
          timepoint: string | null
          trip_id: string | null
        }
        Insert: {
          arrival_time?: string | null
          departure_time?: string | null
          drop_off_type?: string | null
          pickup_type?: string | null
          shape_dist_traveled?: string | null
          stop_headsign?: string | null
          stop_id?: string | null
          stop_sequence?: number | null
          timepoint?: string | null
          trip_id?: string | null
        }
        Update: {
          arrival_time?: string | null
          departure_time?: string | null
          drop_off_type?: string | null
          pickup_type?: string | null
          shape_dist_traveled?: string | null
          stop_headsign?: string | null
          stop_id?: string | null
          stop_sequence?: number | null
          timepoint?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stop_times_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stops"
            referencedColumns: ["stop_id"]
          },
          {
            foreignKeyName: "stop_times_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      stops: {
        Row: {
          location_type: string | null
          parent_station: string | null
          stop_code: string | null
          stop_desc: string | null
          stop_id: string
          stop_lat: number | null
          stop_lon: number | null
          stop_name: string | null
          stop_search: unknown
          stop_timezone: string | null
          stop_url: string | null
          wheelchair_boarding: string | null
          zone_id: string | null
        }
        Insert: {
          location_type?: string | null
          parent_station?: string | null
          stop_code?: string | null
          stop_desc?: string | null
          stop_id: string
          stop_lat?: number | null
          stop_lon?: number | null
          stop_name?: string | null
          stop_search?: unknown
          stop_timezone?: string | null
          stop_url?: string | null
          wheelchair_boarding?: string | null
          zone_id?: string | null
        }
        Update: {
          location_type?: string | null
          parent_station?: string | null
          stop_code?: string | null
          stop_desc?: string | null
          stop_id?: string
          stop_lat?: number | null
          stop_lon?: number | null
          stop_name?: string | null
          stop_search?: unknown
          stop_timezone?: string | null
          stop_url?: string | null
          wheelchair_boarding?: string | null
          zone_id?: string | null
        }
        Relationships: []
      }
      timetable_pages: {
        Row: {
          filename: string | null
          timetable_page_id: string
          timetable_page_label: string | null
        }
        Insert: {
          filename?: string | null
          timetable_page_id: string
          timetable_page_label?: string | null
        }
        Update: {
          filename?: string | null
          timetable_page_id?: string
          timetable_page_label?: string | null
        }
        Relationships: []
      }
      timetable_stop_order: {
        Row: {
          stop_id: string | null
          stop_sequence: number | null
          timetable_id: string | null
        }
        Insert: {
          stop_id?: string | null
          stop_sequence?: number | null
          timetable_id?: string | null
        }
        Update: {
          stop_id?: string | null
          stop_sequence?: number | null
          timetable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_stop_order_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stops"
            referencedColumns: ["stop_id"]
          },
          {
            foreignKeyName: "timetable_stop_order_timetable_id_fkey"
            columns: ["timetable_id"]
            isOneToOne: false
            referencedRelation: "timetables"
            referencedColumns: ["timetable_id"]
          },
        ]
      }
      timetables: {
        Row: {
          direction_id: string | null
          direction_name: string | null
          end_date: string | null
          end_time: string | null
          friday: string | null
          include_exceptions: string | null
          monday: string | null
          orientation: string | null
          route_id: string | null
          saturday: string | null
          service_notes: string | null
          show_trip_continuation: string | null
          start_date: string | null
          start_time: string | null
          sunday: string | null
          thursday: string | null
          timetable_id: string
          timetable_label: string | null
          timetable_page_id: string | null
          timetable_sequence: string | null
          tuesday: string | null
          wednesday: string | null
        }
        Insert: {
          direction_id?: string | null
          direction_name?: string | null
          end_date?: string | null
          end_time?: string | null
          friday?: string | null
          include_exceptions?: string | null
          monday?: string | null
          orientation?: string | null
          route_id?: string | null
          saturday?: string | null
          service_notes?: string | null
          show_trip_continuation?: string | null
          start_date?: string | null
          start_time?: string | null
          sunday?: string | null
          thursday?: string | null
          timetable_id: string
          timetable_label?: string | null
          timetable_page_id?: string | null
          timetable_sequence?: string | null
          tuesday?: string | null
          wednesday?: string | null
        }
        Update: {
          direction_id?: string | null
          direction_name?: string | null
          end_date?: string | null
          end_time?: string | null
          friday?: string | null
          include_exceptions?: string | null
          monday?: string | null
          orientation?: string | null
          route_id?: string | null
          saturday?: string | null
          service_notes?: string | null
          show_trip_continuation?: string | null
          start_date?: string | null
          start_time?: string | null
          sunday?: string | null
          thursday?: string | null
          timetable_id?: string
          timetable_label?: string | null
          timetable_page_id?: string | null
          timetable_sequence?: string | null
          tuesday?: string | null
          wednesday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetables_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "timetables_timetable_page_id_fkey"
            columns: ["timetable_page_id"]
            isOneToOne: false
            referencedRelation: "timetable_pages"
            referencedColumns: ["timetable_page_id"]
          },
        ]
      }
      trips: {
        Row: {
          bikes_allowed: string | null
          block_id: string | null
          direction_id: string | null
          limited_route: string | null
          route_id: string | null
          service_id: string | null
          shape_id: string | null
          trip_headsign: string | null
          trip_id: string
          trip_short_name: string | null
          wheelchair_accessible: string | null
        }
        Insert: {
          bikes_allowed?: string | null
          block_id?: string | null
          direction_id?: string | null
          limited_route?: string | null
          route_id?: string | null
          service_id?: string | null
          shape_id?: string | null
          trip_headsign?: string | null
          trip_id: string
          trip_short_name?: string | null
          wheelchair_accessible?: string | null
        }
        Update: {
          bikes_allowed?: string | null
          block_id?: string | null
          direction_id?: string | null
          limited_route?: string | null
          route_id?: string | null
          service_id?: string | null
          shape_id?: string | null
          trip_headsign?: string | null
          trip_id?: string
          trip_short_name?: string | null
          wheelchair_accessible?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "trips_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "calendar"
            referencedColumns: ["service_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_stops: {
        Args: { search_query: string }
        Returns: {
          stop_code: string
          stop_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
