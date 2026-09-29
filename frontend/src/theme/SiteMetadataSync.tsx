import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { serverApi } from '../services/api'
import { applyDocumentMetadata, resolveSiteMetadata } from '../lib/site-metadata'
import { reconfigureTrackingFromApi } from '../lib/tracking'
import { useTheme } from './ThemeProvider'

export function SiteMetadataSync() {
  const theme = useTheme()
  const info = useQuery({ queryKey: ['server-info'], queryFn: serverApi.info })

  useEffect(() => {
    applyDocumentMetadata(
      resolveSiteMetadata(info.data, theme, {
        discordUrl: import.meta.env.VITE_DISCORD_URL,
        trailerYoutubeId: import.meta.env.VITE_TRAILER_YOUTUBE_ID,
      }),
    )
    if (info.data) {
      reconfigureTrackingFromApi(info.data)
    }
  }, [info.data, theme])

  return null
}
