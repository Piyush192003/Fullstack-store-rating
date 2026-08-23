// Shared client-side validation for the admin Add / Edit store forms.
// Mirrors the rules enforced by BackEnd/utils/validators.js (storeValidation).
export const blankStore = { name: "", email: "", address: "", categoryId: "", priceLevel: "", phone: "", openingHours: "", description: "", ownerId: "" };

export function validateStoreForm(form) {
  const errors = {};

  const name = (form.name || "").trim();
  if (!name) errors.name = "Store name is required.";
  else if (name.length < 2 || name.length > 120) errors.name = "Name must be 2-120 characters.";

  const email = (form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  else if (email.length > 100) errors.email = "Email must be under 100 characters.";

  const phone = (form.phone || "").trim();
  if (phone && !/^[0-9+\-\s()]{6,20}$/.test(phone)) errors.phone = "Phone must be 6-20 characters (digits, spaces or + - ( )).";

  if ((form.address || "").length > 400) errors.address = "Address must be under 400 characters.";
  if ((form.openingHours || "").length > 240) errors.openingHours = "Opening hours must be under 240 characters.";

  return errors;
}
