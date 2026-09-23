import { useEffect, useRef, useState } from "react";

import type { SyncState } from "./liveRoom.types";

type LocalPlaybackAction = "play" | "pause" | "seek";

interface UseYouTubePlayerOptions {
  videoId: string;
  setVideoId: (id: string) => void;
  canControlPlayback: () => boolean;
  onLocalPlaybackAction: (action: LocalPlaybackAction, time: number) => void;
}

interface UseYouTubePlayerResult {
  containerId: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  needsUnmute: boolean;
  togglePlayPause: () => void;
  handleSeek: (value: number) => void;
  handleVolume: (value: number) => void;
  unmutePlayback: () => void;
  applySyncState: (message: SyncState) => void;
  queuePendingSync: (message: SyncState) => void;
}

const CONTAINER_ID = "youtube-player";

/*
 * Owns everything about the embedded YouTube player: creating it,
 * tracking real readiness, applying sync state (pending or live),
 * and the autoplay-safety / black-frame workarounds. Exposes plain
 * actions + applySyncState/queuePendingSync for the caller (the
 * WebSocket message handler) to drive.
 */
export function useYouTubePlayer({
  videoId,
  setVideoId,
  canControlPlayback,
  onLocalPlaybackAction,
}: UseYouTubePlayerOptions): UseYouTubePlayerResult {
  const playerRef = useRef<any>(null);

  /*
   * The object returned by `new YT.Player(...)` exists
   * synchronously, but the YouTube IFrame API only attaches its
   * real methods (getCurrentTime, getDuration, getPlayerState,
   * etc.) once the iframe has actually finished loading - which is
   * exactly when the `onReady` event fires. Calling those methods
   * before then throws "is not a function". This ref tracks real
   * readiness separately from "does playerRef exist".
   */
  const isPlayerReadyRef = useRef(false);

  const applyingRemoteStateRef = useRef(false);
  const lastKnownTimeRef = useRef(0);
  const pendingSyncRef = useRef<SyncState | null>(null);

  /*
   * Holds the setTimeout id for the "give YouTube a second to
   * finish loading" delayed apply in onReady. If a LIVE sync_state
   * broadcast arrives during that window, it must cancel this
   * timeout - otherwise the stale snapshot this timeout closed over
   * fires later and clobbers whatever the live update just
   * correctly set (host presses Play, it works for a moment, then
   * this delayed timeout fires and silently pauses/resets it back).
   */
  const initialSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /*
   * The YT.Player is created inside an effect that only depends on
   * [videoId]. For the HOST, videoId is already known at mount, so
   * the player - and the onStateChange callback given at
   * construction time - is created before the caller even knows
   * the role is "host". Routing onStateChange through a ref that's
   * refreshed every render fixes this without needing to
   * destroy/recreate the YouTube player whenever the role changes
   * (which would cause an unwanted reload/flicker of the embed).
   */
  const playerStateChangeHandlerRef = useRef<(event: any) => void>(() => {});

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  /*
   * True when a remote "playing" state (applied automatically, not
   * from the viewer's own click) got blocked by the browser's
   * autoplay policy and had to fall back to a muted autoplay.
   */
  const [needsUnmute, setNeedsUnmute] = useState(false);

  /*
   * ==================================================
   * LOAD YOUTUBE API
   * ==================================================
   */
  useEffect(() => {
    if (window.YT) {
      return;
    }

    const script = document.createElement("script");

    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;

    document.body.appendChild(script);
  }, []);

  /*
   * ==================================================
   * CREATE YOUTUBE PLAYER
   * ==================================================
   */
  useEffect(() => {
    if (!videoId) {
      return;
    }

    function createPlayer() {
      if (!window.YT || !window.YT.Player) {
        return;
      }

      const playerElement = document.getElementById(CONTAINER_ID);

      if (!playerElement) {
        return;
      }

      if (playerRef.current) {
        playerRef.current.destroy();

        playerRef.current = null;
      }

      isPlayerReadyRef.current = false;

      playerRef.current = new window.YT.Player(CONTAINER_ID, {
        videoId,

        playerVars: {
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },

        events: {
          onReady: (event: any) => {
            const player = event.target;

            isPlayerReadyRef.current = true;

            console.log("YouTube player ready");

            player.setVolume(volume);
            setDuration(player.getDuration());

            const pending = pendingSyncRef.current;

            if (!pending) {
              return;
            }

            console.log("Applying pending sync:", pending);

            pendingSyncRef.current = null;
            applyingRemoteStateRef.current = true;

            const applyState = () => {
              if (!playerRef.current) {
                return;
              }

              console.log("Seeking participant to:", pending.currentTime);

              playerRef.current.seekTo(pending.currentTime, true);

              setCurrentTime(pending.currentTime);
              setIsPlaying(pending.playState === "playing");

              lastKnownTimeRef.current = pending.currentTime;

              if (pending.playState === "playing") {
                attemptRemotePlay(playerRef.current);
              } else {
                /*
                 * First sync ever applied to this freshly-created
                 * player. If it's paused, the embed has never
                 * actually played, so force a frame to paint
                 * rather than leaving it black.
                 */
                paintFirstFrame(playerRef.current);
              }

              setTimeout(() => {
                applyingRemoteStateRef.current = false;
              }, 1000);
            };

            /*
             * Give YouTube time to finish loading the video.
             */
            initialSyncTimeoutRef.current = setTimeout(applyState, 1000);
          },

          /*
           * Routed through a ref so this always calls the latest
           * handlePlayerStateChange closure (current
           * canControlPlayback, etc.) instead of the one frozen at
           * player-creation time.
           */
          onStateChange: (event: any) =>
            playerStateChangeHandlerRef.current(event),
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      isPlayerReadyRef.current = false;

      if (initialSyncTimeoutRef.current) {
        clearTimeout(initialSyncTimeoutRef.current);

        initialSyncTimeoutRef.current = null;
      }

      if (playerRef.current) {
        playerRef.current.destroy();

        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  /*
   * ==================================================
   * UPDATE VIDEO TIME
   * ==================================================
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current || !isPlayerReadyRef.current) {
        return;
      }

      setCurrentTime(playerRef.current.getCurrentTime());

      const playerDuration = playerRef.current.getDuration();

      if (playerDuration) {
        setDuration(playerDuration);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  /*
   * ==================================================
   * YOUTUBE STATE CHANGE
   * ==================================================
   */
  function handlePlayerStateChange(event: any) {
    if (!playerRef.current) {
      return;
    }

    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);

      if (canControlPlayback() && !applyingRemoteStateRef.current) {
        onLocalPlaybackAction("play", playerRef.current.getCurrentTime());
      }
    }

    if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);

      if (canControlPlayback() && !applyingRemoteStateRef.current) {
        onLocalPlaybackAction("pause", playerRef.current.getCurrentTime());
      }
    }
  }

  useEffect(() => {
    playerStateChangeHandlerRef.current = handlePlayerStateChange;
  });

  /*
   * ==================================================
   * APPLY SYNC STATE (live broadcast from the server)
   * ==================================================
   */
  function applySyncState(message: SyncState) {
    /*
     * A live update just arrived, which is always more
     * authoritative than the delayed "give YouTube a second to
     * load" snapshot queued in onReady. Cancel it so it can't fire
     * later and clobber what we're about to apply here.
     */
    if (initialSyncTimeoutRef.current) {
      clearTimeout(initialSyncTimeoutRef.current);

      initialSyncTimeoutRef.current = null;
    }

    /*
     * Player doesn't exist yet, or hasn't finished initializing.
     * Store the sync state so onReady can apply it once the player
     * is actually usable, instead of this call silently throwing.
     */
    if (!playerRef.current || !isPlayerReadyRef.current) {
      pendingSyncRef.current = message;
      setVideoId(message.videoId);

      return;
    }

    if (message.videoId !== videoId) {
      pendingSyncRef.current = message;
      setVideoId(message.videoId);

      return;
    }

    applyingRemoteStateRef.current = true;

    playerRef.current.seekTo(message.currentTime, true);

    setCurrentTime(message.currentTime);
    setIsPlaying(message.playState === "playing");

    lastKnownTimeRef.current = message.currentTime;

    if (message.playState === "playing") {
      attemptRemotePlay(playerRef.current);
    } else {
      playerRef.current.pauseVideo();
    }

    setTimeout(() => {
      applyingRemoteStateRef.current = false;
    }, 500);
  }

  /*
   * Used for the very first sync a room sends (room_created /
   * room_joined).
   *
   * FIX: on a reconnect (e.g. the user refreshed the page), the
   * player can already exist and have fired onReady *before* this
   * message arrives - most commonly for the host, whose videoId is
   * known from localStorage at mount, well before the WebSocket
   * finishes connecting. If we always just stashed the message into
   * pendingSyncRef, nothing would ever consume it (onReady already
   * ran and won't run again for the same videoId), so the
   * reconnecting client would get stuck showing a paused/black
   * player instead of the room's actual, possibly mid-playback,
   * state. If the player is already ready, apply the sync
   * immediately via the same path a live sync_state uses instead of
   * silently queuing something nothing will ever read.
   */
  function queuePendingSync(message: SyncState) {
    if (playerRef.current && isPlayerReadyRef.current) {
      applySyncState(message);
      return;
    }

    pendingSyncRef.current = message;
  }

  /*
   * ==================================================
   * PLAY / PAUSE / SEEK (local user actions)
   * ==================================================
   */
  function togglePlayPause() {
    if (!playerRef.current || !canControlPlayback()) {
      return;
    }

    const state = playerRef.current.getPlayerState();

    if (state === window.YT.PlayerState.PLAYING) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }

  function handleSeek(value: number) {
    if (!playerRef.current || !canControlPlayback()) {
      return;
    }

    playerRef.current.seekTo(value, true);

    setCurrentTime(value);
    lastKnownTimeRef.current = value;

    onLocalPlaybackAction("seek", value);
  }

  /*
   * ==================================================
   * REMOTE PLAY (autoplay-safe)
   * ==================================================
   *
   * Calling player.playVideo() from code (not a direct click) is
   * exactly the situation browsers' autoplay policies are designed
   * to block, especially inside a cross-origin iframe. If the
   * browser blocks it, fall back to a muted autoplay (always
   * allowed) and let the viewer unmute with one click.
   */
  function attemptRemotePlay(player: any) {
    player.playVideo();

    setTimeout(() => {
      const state = player.getPlayerState?.();

      const stillNotPlaying =
        state !== window.YT?.PlayerState?.PLAYING &&
        state !== window.YT?.PlayerState?.BUFFERING;

      if (stillNotPlaying) {
        player.mute();
        player.playVideo();

        setNeedsUnmute(true);
      }
    }, 700);
  }

  /*
   * ==================================================
   * PAINT FIRST FRAME
   * ==================================================
   *
   * With playerVars.controls = 0, a YouTube embed that's been cued
   * but never actually played renders as a plain black rectangle -
   * it doesn't draw a poster/thumbnail on its own. Briefly playing
   * (muted, so it can't be blocked by autoplay policy) and
   * immediately pausing forces YouTube to paint a real frame, then
   * we leave it in the correctly-synced paused state.
   */
  function paintFirstFrame(player: any) {
    const wasMuted = typeof player.isMuted === "function" && player.isMuted();

    player.mute();
    player.playVideo();

    setTimeout(() => {
      player.pauseVideo();

      if (!wasMuted) {
        player.unMute();
        player.setVolume(volume);
      }
    }, 250);
  }

  function unmutePlayback() {
    if (!playerRef.current) {
      return;
    }

    playerRef.current.unMute();
    playerRef.current.setVolume(volume);

    setNeedsUnmute(false);
  }

  function handleVolume(value: number) {
    setVolume(value);

    if (playerRef.current) {
      playerRef.current.setVolume(value);
    }
  }

  return {
    containerId: CONTAINER_ID,
    isPlaying,
    currentTime,
    duration,
    volume,
    needsUnmute,
    togglePlayPause,
    handleSeek,
    handleVolume,
    unmutePlayback,
    applySyncState,
    queuePendingSync,
  };
}
