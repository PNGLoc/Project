import { useEffect, useState } from 'react';
import followApi from '../api/followApi';

export function useFollow(targetType, targetId, onToggle) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      // 1. Kiểm tra lẹ: Nếu không có user/token trong local, coi như chưa follow
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) {
          setIsFollowing(false);
          setInitialised(true);
        }
        return;
      }

      try {
        setLoading(true);
        const data = await followApi.getStatus(targetType, targetId);
        if (isMounted) {
          setIsFollowing(!!data.isFollowing);
          setInitialised(true);
        }
      } catch (error) {
        console.error('[useFollow] status error', error);
        // Nếu lỗi 401 thì thường lib/axios đã xử lý logout, ta set mặc định false
        if (isMounted) {
          setIsFollowing(false);
          setInitialised(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (targetId) {
      fetchStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [targetType, targetId]);

  const toggleFollow = async () => {
    if (!targetId || loading) return;
    try {
      setLoading(true);
      if (isFollowing) {
        await followApi.unfollow(targetType, targetId);
        setIsFollowing(false);
        if (onToggle) onToggle(false); // Callback khi unfollow thành công
      } else {
        await followApi.follow(targetType, targetId);
        setIsFollowing(true);
        if (onToggle) onToggle(true); // Callback khi follow thành công
      }
    } catch (error) {
      console.error('[useFollow] toggle error', error);
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, loading, toggleFollow, initialised };
}


