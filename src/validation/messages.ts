2022

function getFieldLabel(label?: string): string {
  return label ? label : 'This field'
}

export function requiredMessage(label?: string): string {
  return `${getFieldLabel(label)} is required`
}

export function invalidMessage(label?: string): string {
  return `${getFieldLabel(label)} is not valid`
}
