export interface LocationTemplate {
  $id: string
  name: string
  country: string
  locations: string // newline-separated
  createdAt: string
  userId: string
}

export interface LocationTemplateFormData {
  name: string
  country: string
  locations: string
}
