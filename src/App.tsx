
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  Plus,
  Search,
  MapPin,
  X,
  Radio,
  Clock3,
  Zap,
  ChevronRight,
  ShieldCheck,
  MoreHorizontal,
  Crosshair,
  CircleDot,
  Menu,
} from "lucide-react";

import DeviceMap, { type Board } from "./components/map/DeviceMap";
import "./App.css";

interface DeviceEvent {
  id: number;
  deviceId: string;
  deviceName: string;
  title: string;
  description: string;
  gpio: string;
  value: string;
  time: string;
  type: "trigger" | "online" | "offline" | "signal";
}

const initialBoards: Board[] = [];
const initialEvents: DeviceEvent[] = [];

function App() {
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [events, setEvents] = useState<DeviceEvent[]>(initialEvents);
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectingLocation, setSelectingLocation] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [boardName, setBoardName] = useState("");
  const [boardId, setBoardId] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  useEffect(() => {
    async function loadCloudData() {
      setLoadingDevices(true);
      setDatabaseError("");

      const { data: deviceRows, error: devicesError } = await supabase
        .from("devices")
        .select("id, device_code, name, status, latitude, longitude")
        .order("created_at", { ascending: false });

      if (devicesError) {
        console.error("Ошибка загрузки устройств:", devicesError.message);
        setDatabaseError("Не удалось загрузить устройства из облачной базы.");
        setLoadingDevices(false);
        return;
      }

      const cloudBoards: Board[] = (deviceRows ?? []).map((row) => ({
        id: row.device_code,
        name: row.name,
        status: row.status === "online" ? "online" : "offline",
        lat: Number(row.latitude),
        lng: Number(row.longitude),
      }));

      setBoards(cloudBoards);

      const { data: eventRows, error: eventsError } = await supabase
        .from("device_events")
        .select("id, device_id, gpio_pin, signal_value, event_type, created_at, devices(device_code, name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (eventsError) {
        console.error("Ошибка загрузки событий:", eventsError.message);
      } else {
        const mappedEvents: DeviceEvent[] = (eventRows ?? []).map((row: any) => {
          const relatedDevice = Array.isArray(row.devices) ? row.devices[0] : row.devices;
          const value = Number(row.signal_value);
          return {
            id: Number(row.id),
            deviceId: relatedDevice?.device_code ?? row.device_id,
            deviceName: relatedDevice?.name ?? "Устройство",
            title: "Обнаружен сигнал GPIO",
            description: "Изменилось состояние цифрового входа",
            gpio: `GPIO ${row.gpio_pin}`,
            value: value === 1 ? "HIGH · 1" : "LOW · 0",
            time: new Date(row.created_at).toLocaleTimeString("ru-RU"),
            type: "trigger",
          };
        });
        setEvents(mappedEvents);
      }

      setLoadingDevices(false);
    }

    loadCloudData();
  }, []);

  const onlineCount = boards.filter((b) => b.status === "online").length;
  const offlineCount = boards.length - onlineCount;

  const filteredBoards = boards.filter((board) =>
    `${board.name} ${board.id}`.toLowerCase().includes(search.toLowerCase())
  );

  const displayedEvents = selectedBoard
    ? events.filter((event) => event.deviceId === selectedBoard)
    : events;

  const selectedDevice = boards.find((b) => b.id === selectedBoard);

  function openAddModal() {
    setBoardName("");
    setBoardId("");
    setLocation(null);
    setSelectingLocation(false);
    setModalOpen(true);
  }

  function handleMapClick(lat: number, lng: number) {
    if (selectingLocation) {
      setLocation({ lat, lng });
      setSelectingLocation(false);
      setModalOpen(true);
    }
  }

  function addBoard() {
    if (!boardName.trim() || !/^\d{6}$/.test(boardId)) {
      return;
    }

    if (boards.some((board) => board.id === boardId)) {
      alert("Устройство с таким ID уже зарегистрировано.");
      return;
    }

    if (!location) {
      alert("Выберите местоположение устройства на карте.");
      return;
    }

    const newBoard: Board = {
      id: boardId,
      name: boardName.trim(),
      status: "offline",
      lat: location.lat,
      lng: location.lng,
    };

    setBoards((prev) => [...prev, newBoard]);

    const newEvent: DeviceEvent = {
      id: Date.now(),
      deviceId: boardId,
      deviceName: boardName.trim(),
      title: "Плата зарегистрирована",
      description: "Новое устройство добавлено в систему",
      gpio: "SYSTEM",
      value: "ЗАРЕГИСТРИРОВАНО",
      time: new Date().toLocaleTimeString(),
      type: "online",
    };

    setEvents((prev) => [newEvent, ...prev]);
    setSelectedBoard(null);
    setModalOpen(false);
  }

  function clearFilter() {
    setSelectedBoard(null);
  }

  function simulateSignal(board: Board) {
    const newEvent: DeviceEvent = {
      id: Date.now(),
      deviceId: board.id,
      deviceName: board.name,
      title: "Обнаружен сигнал GPIO",
      description: "Создано тестовое событие вручную",
      gpio: "GPIO 18",
      value: "HIGH · 1",
      time: new Date().toLocaleTimeString(),
      type: "trigger",
    };

    setEvents((prev) => [newEvent, ...prev]);
  }

  return (
    <div className="nexus-app">
      <header className="top-header">
        <div className="brand">
          <div className="brand-mark">
            <Radio size={22} />
          </div>
          <div className="brand-text">
            <h1>NEXUS<span>IoT</span></h1>
            <p>МОНИТОРИНГ ОБОРУДОВАНИЯ</p>
          </div>
        </div>

        <div className="header-center">
          <span className="header-live-dot" />
          ВСЕ СИСТЕМЫ РАБОТАЮТ
        </div>

        <div className="header-right">
          <div className="header-date">
            <Clock3 size={14} />
            <span>СЕТЬ УСТРОЙСТВ</span>
          </div>
          <button className="header-add" onClick={openAddModal}>
            <Plus size={17} />
            ДОБАВИТЬ ПЛАТУ
          </button>
          <button
            className="mobile-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Открыть меню"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <main className="main-layout">
        <section className="left-column">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">СЕТЬ ОБОРУДОВАНИЯ</span>
              <h2>Устройства <span className="count-badge">{boards.length}</span></h2>
            </div>
            <button className="small-icon-button" aria-label="Device options">
              <MoreHorizontal size={19} />
            </button>
          </div>

          <div className="device-summary">
            <div className="summary-item">
              <span className="summary-indicator green-indicator" />
              <span>В сети</span>
              <strong>{onlineCount}</strong>
            </div>
            <div className="summary-separator" />
            <div className="summary-item">
              <span className="summary-indicator gray-indicator" />
              <span>Не в сети</span>
              <strong>{offlineCount}</strong>
            </div>
          </div>

          <div className="device-search">
            <Search size={16} />
            <input
              placeholder="Поиск по ID или названию устройства..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span>⌘ K</span>
          </div>

          {databaseError && <div className="empty-events">{databaseError}</div>}
          <div className="device-list">
            {filteredBoards.map((board) => (
              <button
                className={`device-card ${selectedBoard === board.id ? "device-selected" : ""}`}
                key={board.id}
                onClick={() =>
                  setSelectedBoard(selectedBoard === board.id ? null : board.id)
                }
              >
                <div className="device-card-icon">
                  <Cpu size={20} />
                  <span className={`device-presence ${board.status}`} />
                </div>

                <div className="device-card-info">
                  <div className="device-card-name">{board.name}</div>
                  <div className="device-card-id">ID: {board.id}</div>
                  <div className={`device-card-status ${board.status}`}>
                    <span /> {board.status === "online" ? "В СЕТИ" : "НЕ В СЕТИ"}
                  </div>
                </div>

                <ChevronRight size={17} className="device-chevron" />
              </button>
            ))}

            {filteredBoards.length === 0 && (
              <div className="empty-devices">
                <Search size={23} />
                <p>{loadingDevices ? "Загрузка устройств..." : "Устройства не найдены"}</p>
              </div>
            )}
          </div>

          <button className="add-device-inline" onClick={openAddModal}>
            <Plus size={17} />
            Добавить новую плату
          </button>

          <div className="events-section">
            <div className="events-heading">
              <div>
                <span className="section-eyebrow">АКТИВНОСТЬ В РЕАЛЬНОМ ВРЕМЕНИ</span>
                <h2>Журнал событий <span className="event-count">{displayedEvents.length}</span></h2>
              </div>
              {selectedBoard && (
                <button className="clear-filter" onClick={clearFilter}>
                  СБРОСИТЬ ФИЛЬТР <X size={12} />
                </button>
              )}
            </div>

            {selectedDevice && (
              <div className="filter-indicator">
                Показаны события устройства <strong>{selectedDevice.id}</strong>
              </div>
            )}

            <div className="event-list">
              {displayedEvents.map((event) => (
                <div className="event-item" key={event.id}>
                  <div className={`event-icon event-${event.type}`}>
                    {event.type === "trigger" ? (
                      <Zap size={16} />
                    ) : event.type === "offline" ? (
                      <WifiOff size={16} />
                    ) : event.type === "online" ? (
                      <Wifi size={16} />
                    ) : (
                      <Activity size={16} />
                    )}
                  </div>

                  <div className="event-content">
                    <div className="event-title">{event.title}</div>
                    <div className="event-description">{event.description}</div>
                    <div className="event-meta">
                      <span>{event.deviceId}</span>
                      <span>·</span>
                      <span>{event.gpio}</span>
                    </div>
                    <div className="event-time">
                      <Clock3 size={11} /> {event.time}
                    </div>
                  </div>

                  <span className={`event-value ${event.type}`}>
                    {event.value}
                  </span>
                </div>
              ))}

              {displayedEvents.length === 0 && (
                <div className="empty-events">Для этого устройства пока нет событий.</div>
              )}
            </div>
          </div>

          <div className="left-footer">
            <span><ShieldCheck size={13} /> Локальный режим предварительного просмотра</span>
            <span>v0.2.0</span>
          </div>
        </section>

        <section className="right-column">
          <div className="map-topbar">
            <div>
              <span className="section-eyebrow">ГЕОГРАФИЧЕСКИЙ МОНИТОРИНГ</span>
              <h2>Местоположение устройств</h2>
              <p>Отслеживайте расположение оборудования на карте.</p>
            </div>
            <div className="map-tools">
              <button className="map-tool-button" title="Центр карты: Бухара">
                <Crosshair size={17} />
              </button>
              <button className="map-add-button" onClick={openAddModal}>
                <Plus size={16} /> ADD
              </button>
            </div>
          </div>

          <div className="map-container">
            <DeviceMap
              boards={boards}
              onMapClick={handleMapClick}
              selectingLocation={selectingLocation}
              selectedLocation={location}
            />

            <div className="map-overlay map-overlay-top">
              <div className="map-region">
                <MapPin size={14} />
                БУХАРА, УЗБЕКИСТАН
              </div>
              <div className="map-live">
                <span /> КАРТА В РЕАЛЬНОМ ВРЕМЕНИ
              </div>
            </div>

            <div className="map-overlay map-overlay-bottom">
              <div className="map-legend">
                <span><i className="legend-online" /> Online</span>
                <span><i className="legend-offline" /> Offline</span>
              </div>
              <div className="map-coordinates">
                39.7747° N / 64.4286° E
              </div>
            </div>
          </div>

          <div className="map-bottom-info">
            <div className="location-summary">
              <div className="location-icon"><MapPin size={18} /></div>
              <div>
                <strong>Бухарская область</strong>
                <span>Узбекистан · Центральная Азия</span>
              </div>
            </div>
            <div className="map-device-count">
              <span className="map-count-number">{boards.length.toString().padStart(2, "0")}</span>
              <span>ПЛАТ НА КАРТЕ</span>
            </div>
          </div>

          <div className="map-selected-panel">
            <div className="selected-panel-header">
              <div>
                <span className="section-eyebrow">ИНФОРМАЦИЯ ОБ УСТРОЙСТВЕ</span>
                <h3>{selectedDevice ? selectedDevice.name : "Выберите устройство"}</h3>
              </div>
              {selectedDevice && (
                <span className={`device-card-status ${selectedDevice.status}`}>
                  <span /> {selectedDevice.status === "online" ? "В СЕТИ" : "НЕ В СЕТИ"}
                </span>
              )}
            </div>

            {selectedDevice ? (
              <>
                <div className="selected-device-data">
                  <div><span>ID УСТРОЙСТВА</span><strong>{selectedDevice.id}</strong></div>
                  <div><span>ШИРОТА</span><strong>{selectedDevice.lat.toFixed(5)}</strong></div>
                  <div><span>ДОЛГОТА</span><strong>{selectedDevice.lng.toFixed(5)}</strong></div>
                </div>
                <button
                  className="test-signal-button"
                  onClick={() => simulateSignal(selectedDevice)}
                >
                  <Zap size={15} /> СОЗДАТЬ ТЕСТОВЫЙ СИГНАЛ
                </button>
              </>
            ) : (
              <p className="selected-empty">
                Выберите устройство из списка или нажмите на его метку на карте.
              </p>
            )}
          </div>

          <div className="map-footer">
            <span><CircleDot size={12} /> OpenStreetMap</span>
            <span>Координаты устройств указаны для примера</span>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-eyebrow">DEVICE MANAGEMENT</span>
                <h2>Регистрация новой платы</h2>
                <p>Добавьте ESP32 в свою сеть устройств.</p>
              </div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-field">
              <label>НАЗВАНИЕ ПЛАТЫ</label>
              <input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Например: Датчик дыма ESP32 № 1"
                maxLength={50}
              />
            </div>

            <div className="form-field">
              <label>UNIQUE ID УСТРОЙСТВА</label>
              <input
                value={boardId}
                onChange={(e) => setBoardId(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Введите 6-значный ID"
                inputMode="numeric"
                maxLength={6}
              />
              <span className="field-hint">Ровно 6 цифр. ID должен быть уникальным.</span>
            </div>

            <div className="form-field">
              <label>МЕСТОПОЛОЖЕНИЕ УСТРОЙСТВА</label>
              <div className={`location-picker ${location ? "location-selected" : ""}`}>
                <div className="location-picker-icon">
                  <MapPin size={19} />
                </div>
                <div className="location-picker-text">
                  <strong>{location ? "Местоположение выбрано" : "Выберите точку на карте"}</strong>
                  <span>
                    {location
                      ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                      : "Укажите точное местоположение платы."}
                  </span>
                </div>
                <button
                  className="choose-location-button"
                  onClick={() => {
                    setSelectingLocation(true);
                    setModalOpen(false);
                  }}
                >
                  ВЫБРАТЬ
                </button>
              </div>
              <span className="field-hint">
                {selectingLocation
                  ? "Нажмите на карту, чтобы выбрать местоположение."
                  : "Для регистрации платы необходимо указать местоположение."}
              </span>
            </div>

            <div className="modal-note">
              <ShieldCheck size={16} />
              Просмотр загружает данные из Supabase. Для безопасной регистрации плат подключим авторизацию и серверную проверку доступа.
            </div>

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setModalOpen(false)}>
                ОТМЕНА
              </button>
              <button
                className="submit-button"
                onClick={addBoard}
                disabled={!boardName.trim() || boardId.length !== 6 || !location}
              >
                <Plus size={16} /> ЗАРЕГИСТРИРОВАТЬ ПЛАТУ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
