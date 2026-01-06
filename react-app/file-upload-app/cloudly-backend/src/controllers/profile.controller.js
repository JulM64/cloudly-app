const ProfileController = {
  getProfile(req, res) {
    res.json({ message: 'Profile endpoint works!' });
  },
  updateProfile(req, res) {
    res.json({ message: 'Update profile endpoint works!' });
  },
  updatePreferences(req, res) {
    res.json({ message: 'Update preferences endpoint works!' });
  },
  getStats(req, res) {
    res.json({ 
      stats: { 
        totalUploads: 0, 
        totalStorageUsed: 0,
        formattedStorage: '0 Bytes'
      } 
    });
  }
};

module.exports = ProfileController;
