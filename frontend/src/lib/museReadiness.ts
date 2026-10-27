export function museSignalReady(status: string, acceptedChannels: number, bandsUpdatedAt: number | null, now: number) {
  return status === 'streaming' && acceptedChannels > 0 && bandsUpdatedAt !== null && now >= bandsUpdatedAt && now - bandsUpdatedAt <= 5000
}
