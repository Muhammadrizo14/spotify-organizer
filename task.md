### Prompting to be connected 


I have the src/app/create/components/form.tsx form where you need to build up the prompting system
when user enters the discription of the playlist within the propt textarea you need to catch up the 
settings of the described playlist.


#### Example

prompt like 

```chill night drive, some r&b, not too slow, mix of old and new```

will have this kind of settings


```
{
  "mood": "chill",
  "genres": ["rnb", "soul"],
  "energy": 0.4,
  "tempo": "medium",
  "era": ["2000s", "2010s", "2020s"],
  "source": "mix"
}
```


Then u will make the request to the spotify api for the musics



#### Good if we will have this


I want to have checkbox like include my saved music which makes the playlist look like this

60% → user liked songs 
40% → new recommendations
