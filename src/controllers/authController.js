const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Save reset token to user
    await user.update({
      resetToken,
      resetTokenExpiry
    });

    // Send reset email
    // Note: Implement your email sending logic here
    
    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

// Add to exports
module.exports = {
  // ... existing exports ...
  forgotPassword
};