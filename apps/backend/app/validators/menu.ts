import vine from '@vinejs/vine'

export const createMenuValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100),
    description: vine.string().optional(),
    price: vine.number().positive(),
    actif: vine.boolean().optional(),
    entrepriseIds: vine
      .any()
      .transform((value) => {
        if (Array.isArray(value)) return value;
        
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            if (value.includes(',')) {
              return value.split(',').map(v => Number(v.trim()));
            }
          }
        }
        
        return undefined;
      })
      .optional(),
    image: vine
      .file({
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })
      .optional(),
  })
)

export const updateMenuValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100).optional(),
    description: vine.string().optional(),
    prix: vine.number().positive().optional(),
    actif: vine.boolean().optional(),
    entrepriseIds: vine
      .any()
      .transform((value) => {
        if (Array.isArray(value)) return value;
        
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch (e) {
            if (value.includes(',')) {
              return value.split(',').map(v => Number(v.trim()));
            }
          }
        }
        
        return undefined;
      })
      .optional(),
    image: vine
      .file({
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })
      .optional(),
  })
)
