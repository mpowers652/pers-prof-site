import React, { useState, useEffect } from 'react';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState({});
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/auth/verify', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setFormData({
          username: data.user.username,
          email: data.user.email,
          password: ''
        });
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field) => {
    setEditMode({ ...editMode, [field]: true });
    setError('');
    setSuccess('');
  };

  const handleCancel = (field) => {
    setEditMode({ ...editMode, [field]: false });
    setFormData({
      ...formData,
      [field]: field === 'password' ? '' : user[field]
    });
  };

  const handleSave = async (field) => {
    try {
      const response = await fetch('/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: formData[field] })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser({ ...user, [field]: formData[field] });
          setEditMode({ ...editMode, [field]: false });
          setSuccess(`${field} updated successfully`);
          if (field === 'password') setFormData({ ...formData, password: '' });
        } else {
          setError(data.message || 'Update failed');
        }
      } else {
        setError('Update failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const response = await fetch('/auth/upload-profile-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser({ ...user, profileImage: data.imageUrl });
          setSuccess('Profile image updated successfully');
        } else {
          setError(data.message || 'Image upload failed');
        }
      } else {
        setError('Image upload failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const getProfileImage = () => {
    if (user.profileImage) return user.profileImage;
    if (user.googlePhoto) return `/proxy/image?url=${encodeURIComponent(user.googlePhoto)}`;
    if (user.facebookPhoto) return user.facebookPhoto;
    return null;
  };

  const getSubscriptionDaysLeft = () => {
    if (!user.subscription || user.subscription === 'basic') return 'N/A';
    if (user.subscription === 'full' && user.role === 'admin') return 'Unlimited';
    // Mock calculation - in real app this would be based on subscription end date
    return Math.floor(Math.random() * 30) + 1;
  };

  const getAICredits = () => {
    // Mock AI credits - in real app this would come from user data
    return user.aiCredits || Math.floor(Math.random() * 100) + 50;
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
        <p>Please log in to view your profile.</p>
        <a href="/login" className="btn">Log In</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#2c3e50' }}>User Profile</h2>
      
      {error && (
        <div style={{ 
          background: '#fdf2f2', 
          color: '#e74c3c', 
          padding: '1rem', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          borderLeft: '4px solid #e74c3c'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          background: '#f0f9ff', 
          color: '#27ae60', 
          padding: '1rem', 
          borderRadius: '4px', 
          marginBottom: '1rem',
          borderLeft: '4px solid #27ae60'
        }}>
          {success}
        </div>
      )}

      {/* Profile Image and Username */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ 
          width: '120px', 
          height: '120px', 
          margin: '0 auto 1rem', 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: '3px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f9fa',
          cursor: 'pointer',
          position: 'relative'
        }}>
          {getProfileImage() ? (
            <img 
              src={getProfileImage()} 
              alt="Profile" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ color: '#666', fontSize: '3rem' }}>👤</span>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          />
        </div>
        <h3 style={{ color: '#2c3e50', margin: 0 }}>{user.username}</h3>
        {user.role === 'admin' && (
          <span style={{
            background: '#27ae60',
            color: 'white',
            padding: '0.3rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 'bold',
            marginLeft: '0.5rem'
          }}>
            ADMIN
          </span>
        )}
      </div>

      {/* 3x2 Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Top Row - Profile Elements */}
        
        {/* Username */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>Username</h4>
          {editMode.username ? (
            <div>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}
              />
              <div>
                <button
                  onClick={() => handleSave('username')}
                  style={{
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    marginRight: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancel('username')}
                  style={{
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 0.5rem 0' }}>{user.username}</p>
              <button
                onClick={() => handleEdit('username')}
                style={{
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Password */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>Password</h4>
          {user.googleId || user.facebookId ? (
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
              OAuth login - password not applicable
            </p>
          ) : editMode.password ? (
            <div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '0.5rem'
                }}
              />
              <div>
                <button
                  onClick={() => handleSave('password')}
                  style={{
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    marginRight: '0.5rem',
                    cursor: 'pointer'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => handleCancel('password')}
                  style={{
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 0.5rem 0' }}>••••••••</p>
              <button
                onClick={() => handleEdit('password')}
                style={{
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Profile Image */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>Profile Image</h4>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 0.5rem',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8f9fa'
            }}>
              {getProfileImage() ? (
                <img 
                  src={getProfileImage()} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ color: '#666', fontSize: '1.5rem' }}>👤</span>
              )}
            </div>
            <label style={{
              background: '#3498db',
              color: 'white',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              Upload
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Bottom Row - Feature Elements */}
        
        {/* AI Credits */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>AI Credits</h4>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>
            {getAICredits()}
          </p>
          <button
            onClick={() => window.open('https://example.com/buy-credits', '_blank')}
            style={{
              background: '#f39c12',
              color: 'white',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Buy More
          </button>
        </div>

        {/* Subscription Days */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>Subscription</h4>
          <p style={{ margin: '0 0 0.3rem 0', textTransform: 'capitalize' }}>
            <strong>{user.subscription}</strong>
          </p>
          <p style={{ margin: '0 0 0.5rem 0', color: '#666' }}>
            Days left: <strong>{getSubscriptionDaysLeft()}</strong>
          </p>
          <button
            onClick={() => window.location.href = '/subscription'}
            style={{
              background: '#9b59b6',
              color: 'white',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Manage
          </button>
        </div>

        {/* Pre-pay Subscription */}
        <div style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>Pre-pay</h4>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
            Extend your subscription with prepayment
          </p>
          <button
            onClick={() => window.open('https://example.com/prepay-subscription', '_blank')}
            style={{
              background: '#27ae60',
              color: 'white',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Pre-pay Now
          </button>
        </div>
      </div>

      {/* Back to Home */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            background: '#2c3e50',
            color: 'white',
            border: 'none',
            padding: '0.8rem 2rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;