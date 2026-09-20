const { Category, Store } = require('../models');

exports.listCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .collation({ locale: 'en', strength: 2 })
      .sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Category name required' });
    const existing = await Category.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Category already exists' });
    const category = await Category.create({ name });
    res.json({ category });
  } catch (err) {
    if (err && err.code === 11000)
      return res.status(400).json({ message: 'Category already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    // Detach stores that were using this category
    await Store.updateMany({ categoryId: deleted.id }, { $set: { categoryId: null } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
