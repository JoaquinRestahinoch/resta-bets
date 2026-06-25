import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;

export default function useSocket() {
  const [connected, setConnected] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState({});
  const [scraperStatus, setScraperStatus] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [eventCount, setEventCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const addNotification = useCallback((notif) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [{ ...notif, id }, ...prev].slice(0, 20));
    if (notif.autoDismiss !== false) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, notif.duration || 8000);
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      addNotification({ type: 'info', title: 'Conectado', message: 'Conexion establecida con el servidor', duration: 3000 });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      addNotification({ type: 'error', title: 'Desconectado', message: 'Se perdio la conexion con el servidor' });
    });

    socket.on('state', (data) => {
      setOpportunities(data.opportunities || []);
      setStats(data.stats || {});
      setScraperStatus(data.scraperStatus || []);
      setLastUpdate(data.lastUpdate);
      setEventCount(data.eventCount || 0);
    });

    socket.on('oddsUpdate', (data) => {
      setOpportunities(data.opportunities || []);
      setStats(data.stats || {});
      setScraperStatus(data.scraperStatus || []);
      setLastUpdate(data.lastUpdate);
      setEventCount(data.eventCount || 0);
    });

    socket.on('newOpportunity', (opp) => {
      addNotification({
        type: 'success',
        title: 'Oportunidad encontrada!',
        message: `${opp.matchName} — ROI: ${opp.roi.toFixed(2)}% — Ganancia: $${opp.profit.toFixed(2)}`,
        duration: 12000,
      });
    });

    socket.on('opportunityExpired', ({ opportunityId }) => {
      setOpportunities(prev => prev.filter(o => o.opportunityId !== opportunityId));
    });

    socket.on('scrapingError', (data) => {
      addNotification({ type: 'error', title: 'Error de scraping', message: data.message, duration: 5000 });
    });

    return () => { socket.disconnect(); };
  }, [addNotification]);

  const setInvestment = useCallback((amount) => {
    socketRef.current?.emit('setInvestment', amount);
  }, []);

  return {
    connected, opportunities, stats, scraperStatus,
    lastUpdate, eventCount, notifications,
    dismissNotification, setInvestment,
  };
}
