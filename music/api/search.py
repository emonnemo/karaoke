import base64
import datetime
import requests

from django.conf import settings
from functools import lru_cache
from rest_framework.response import Response
from rest_framework.views import APIView


#@lru_cache(maxsize=4096)
def levenshtein(sentence, other):
    if not sentence: return len(other)
    if not other: return len(sentence)
    if sentence[0] == other[0]: return levenshtein(sentence[1:], other[1:]) - 1 # correct score 1
    l1 = levenshtein(sentence, other[1:]) # insertion score -1
    l2 = levenshtein(sentence[1:], other) # deletion score -1
    l3 = levenshtein(sentence[1:], other[1:]) # substitution score -1
    return 1 + min(l1, l2, l3)


def search_keyword(keyword):
    songs_list = settings.SONGS_LIST
    min_distance = 999
    results = []
    for song in songs_list:
        distance = levenshtein(keyword.split(), song.split())
        if distance == min_distance:
            results.append(song)
        elif distance < min_distance:
            results = [song]
            min_distance = distance

    return results


class SearchKeywordView(APIView):

    def post(self, request):
        keyword = request.data.get('keyword')
        response = {
            'keyword': keyword,
            'results': search_keyword(keyword),
            'status': 'ok',
        }
        return Response(response)


class SearchASRView(APIView):

    def post(self, request):
        prefix = 'recording'
        path = 'recordings'
        filename = '%s_%s' % (prefix, request.data.get('filename'))
        full_filename = '%s/%s' % (path, filename)
        with open(full_filename, 'wb') as f:
            data = request.data['blob']
            clean_data = data[data.find(',') + 1:]
            decoded = base64.b64decode(clean_data)
            f.write(decoded)
        # MEDIA HOSTING SERVER LOCATED IN OTHER PORT
        file_path = '%s/%s' % (settings.MEDIA_API, filename)
        if request.data.get('api_type') == 'song':
            api = '%s/asr_upload' % settings.SONG_ASR_API
            keyword = ''
            try:
                r = requests.get(api, params={'wav_addr': file_path})
                print (r.url)
                keyword = r.json().get('words')
            except:
                pass
            if keyword == None or keyword.strip() == '':
                results = []
            else:
                results = search_keyword(keyword)
            response = {
                'keyword': keyword,
                'results': results,
                'status': 'ok',
            }
        elif request.data.get('api_type') == 'number':
            api = '%s/asr_upload' % settings.NUMBER_ASR_API
            try:
                r = requests.get(api, params={'wav_addr': file_path})
                print (r.url)
                print (r.json())
                number = int(r.json().get('words'))
            except:
                return Response({'number': 1, 'status': 'error'})
            response = {
                'number': number,
                'status': 'ok',
            }

        return Response(response)

