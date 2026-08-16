const QueueHubLocalVenueProvider={
  name:'local',
  async loadSnapshot(){
    return QueueHubProviderContracts.venueSnapshot({source:'local',venue:{id:venue.id,slug:venue.id,name:venue.name,capacityTarget:venue.capacityTarget},restaurants:QueueHubVenueRepository.restaurants()});
  }
};
