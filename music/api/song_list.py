from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView


class SongView(APIView):

    def get(self, request):
        songs_list = settings.SONGS_LIST
        response = []
        for index, song in enumerate(songs_list):
            song_object = {
                'id': index + 1,
                'url': '/static/%s - %s.wav' % (song['title'], song['author']),
                'title': song['title'],
                'author': song['author'],
            }
            response.append(song_object)
        return Response({'songs': response, 'status': 'ok'})

