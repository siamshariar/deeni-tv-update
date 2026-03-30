'use client'

import { useState, useEffect, useCallback } from 'react'
import { SyncedVideoPlayer } from '@/components/synced-video-player'
import { MenuDrawer, MenuOption } from '@/components/menu-drawer'
import { DonateButton } from '@/components/donate-button'
import { ScheduleModal } from '@/components/schedule-modal'
import { AboutModal } from '@/components/about-modal'
import { ChannelSelector } from '@/components/channel-selector'
import { VideoProgram } from '@/types/schedule'
import { getSavedChannel, saveChannel, ApiChannel, getStoredApiChannels, saveApiChannels } from '@/lib/schedule-utils'
import { clientFetchWithAuth } from '@/lib/client-fetch'

export default function Home() {
  const [activeChannelId, setActiveChannelId] = useState<string>('')
  const [apiChannels, setApiChannels] = useState<ApiChannel[]>([])
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isChannelSelectorOpen, setIsChannelSelectorOpen] = useState(false)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [activeModal, setActiveModal] = useState<'schedule' | 'about' | null>(null)
  const [currentProgramId, setCurrentProgramId] = useState<string>('')
  const [liveSchedule, setLiveSchedule] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [showStartModal, setShowStartModal] = useState(false)
  const [openHistoryModal, setOpenHistoryModal] = useState(false)
  const [openChannelSelectorModal, setOpenChannelSelectorModal] = useState(false)
  const [reloadCounter, setReloadCounter] = useState(0)

  // Check localStorage for saved channel on initial load
  useEffect(() => {
    // Load stored API channels (if any) for the ChannelSelector
    const stored = getStoredApiChannels()
    if (stored.length > 0) setApiChannels(stored)

    const savedChannel = getSavedChannel()
    if (savedChannel) {
      setActiveChannelId(savedChannel)
      setHasUserInteracted(true)
      setIsFirstTimeUser(false)
      // If channel exists, show start modal
      setShowStartModal(true)
    } else {
      // First time user - show channel selector immediately (must select)
      setIsFirstTimeUser(true)
      setIsChannelSelectorOpen(true)
    }
    setIsLoading(false)
  }, [])

  // Fetch channel list for the ChannelSelector when it opens (first-time users)
  useEffect(() => {
    if (!isChannelSelectorOpen) return
    if (apiChannels.length > 0) return // already loaded
    ;(async () => {
      try {
        const res = await clientFetchWithAuth('https://api.deeniinfotech.com/api/tv-channels')
        if (res?.data?.length) {
          saveApiChannels(res.data)
          setApiChannels(res.data)
          return
        }
      } catch { /* ignore */ }
      // Fallback: Next.js route (uses static data on STG)
      try {
        const res = await fetch('/api/tv-channels')
        const json = await res.json()
        if (json?.data?.length) {
          saveApiChannels(json.data)
          setApiChannels(json.data)
        }
      } catch { /* ignore */ }
    })()
  }, [isChannelSelectorOpen, apiChannels.length])

  // Called by SyncedVideoPlayer whenever the current program / schedule changes
  // (video ended → next started, API sync, queue shift, etc.)
  const handleProgramChange = useCallback((newProgramId: string, schedule: VideoProgram[]) => {
    setCurrentProgramId(newProgramId)
    setLiveSchedule(schedule as any[])
  }, [])

  const handleSelectChannel = (channelId: string) => {
    setActiveChannelId(channelId)
    saveChannel(channelId)
    setHasUserInteracted(true)
    setIsFirstTimeUser(false)
    setIsChannelSelectorOpen(false)
    
    // After channel selection, show start modal immediately to avoid
    // pre-start audio leaking from early channel loading.
    setShowStartModal(true)
  }

  const handleStartClick = () => {
    setShowStartModal(false)
    // The video player will handle the actual playback
  }

  const handleMenuOptionSelect = (option: MenuOption) => {
    setIsMenuOpen(false)
    
    if (option === 'language') {
      setTimeout(() => {
        setOpenChannelSelectorModal(true)
      }, 300)
    } else if (option === 'history') {
      setTimeout(() => {
        setOpenHistoryModal(true)
      }, 300)
    } else if (option === 'reload') {
      setReloadCounter(c => c + 1)
    } else if (option === 'donate') {
      window.open('https://www.deeniinfotech.com/donate#donation-form', '_blank', 'noopener,noreferrer')
    } else {
      setTimeout(() => {
        setActiveModal(option as 'schedule' | 'about')
      }, 300)
    }
  }

  const handleCloseModal = () => {
    setActiveModal(null)
  }

  const handleCloseChannelSelector = () => {
    // If first time user closes without selecting, don't allow
    if (isFirstTimeUser && !activeChannelId) {
      return // Do nothing, must select
    }
    setIsChannelSelectorOpen(false)
  }

  // If still loading initial state, show minimal loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white">Loading Deeni.tv...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="relative min-h-screen bg-zinc-950">
      {/* Logo Header - Commented out per requirements */}
      {/* <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-50 flex items-center">
        <img 
          src="/DeeniTV.svg" 
          alt="Deeni.tv Logo" 
          className="h-8 w-auto sm:h-9 md:h-10 lg:h-11 drop-shadow-lg hover:opacity-90 transition-opacity"
        />
      </div> */}
      
      {/* Donate Button - Fixed position */}
      <DonateButton />
      
      {/* Synchronized Video Player */}
      <SyncedVideoPlayer 
        onMenuOpen={() => setIsMenuOpen(true)}
        initialChannelId={activeChannelId}
        onChannelChange={setActiveChannelId}
        showStartModal={showStartModal}
        onStartClick={handleStartClick}
        openHistoryModal={openHistoryModal}
        onHistoryModalClose={() => setOpenHistoryModal(false)}
        onOpenSchedule={() => setActiveModal('schedule')}
        openChannelSelectorModal={openChannelSelectorModal}
        onChannelSelectorModalClose={() => setOpenChannelSelectorModal(false)}
        onProgramChange={handleProgramChange}
        triggerReload={reloadCounter}
      />
      
      {/* Menu Drawer - Slides from bottom */}
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectOption={handleMenuOptionSelect}
      />
      
      {/* Channel/Language Selector */}
      <ChannelSelector
        isOpen={isChannelSelectorOpen}
        onClose={handleCloseChannelSelector}
        channels={apiChannels}
        onSelectChannel={handleSelectChannel}
        currentChannelId={activeChannelId}
        isFirstTime={isFirstTimeUser}
      />
      
      {/* Modals */}
      <ScheduleModal
        isOpen={activeModal === 'schedule'}
        onClose={handleCloseModal}
        schedule={liveSchedule}
        currentProgramId={currentProgramId}
      />
      
      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={handleCloseModal}
      />
    </main>
  )
}
