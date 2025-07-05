import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'slow' | 'poor'>('good');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored', { id: 'connection-status' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost', { id: 'connection-status' });
    };    // Check connection quality periodically
    const checkConnectionQuality = async () => {
      if (!isOnline) return;

      try {
        const start = Date.now();
        // Test connection to our Code Editor API
        const response = await fetch('http://localhost:3003/api/languages/available', { 
          method: 'HEAD',
          cache: 'no-cache',
          headers: {
            'x-user-id': 'demo-user',
            'x-user-tier': 'pro'
          }
        });
        const duration = Date.now() - start;

        if (response.ok) {
          if (duration < 200) {
            setConnectionQuality('good');
          } else if (duration < 1000) {
            setConnectionQuality('slow');
          } else {
            setConnectionQuality('poor');
          }
        } else {
          setConnectionQuality('poor');
        }
      } catch (error) {
        setConnectionQuality('poor');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality every 30 seconds
    const qualityCheck = setInterval(checkConnectionQuality, 30000);
    
    // Initial check
    checkConnectionQuality();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityCheck);
    };
  }, [isOnline]);

  if (isOnline && connectionQuality === 'good') {
    return null; // Don't show anything when connection is good
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500 text-white';
    if (connectionQuality === 'poor') return 'bg-red-500 text-white';
    if (connectionQuality === 'slow') return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  };

  const getStatusText = () => {
    if (!isOnline) return '🔴 Offline';
    if (connectionQuality === 'poor') return '🟠 Poor connection';
    if (connectionQuality === 'slow') return '🟡 Slow connection';
    return '🟢 Connected';
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className={`px-4 py-2 rounded-lg shadow-lg ${getStatusColor()} text-sm font-medium`}>
        {getStatusText()}
      </div>
    </div>
  );
};

export default ConnectionStatus;
