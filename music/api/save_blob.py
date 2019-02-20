import base64
import datetime

from rest_framework.response import Response
from rest_framework.views import APIView


class SaveBlob(APIView):

    def post(self, request):
        prefix = 'recording'
        path = 'recordings'
        filename = request.data.get('filename')
        full_filename = '%s/%s_%s' % (path, prefix, filename)
        with open(full_filename, 'wb') as f:
            data = request.data['blob']
            clean_data = data[data.find(',') + 1:]
            decoded = base64.b64decode(clean_data)
            f.write(decoded)
        return Response({'status': 'ok'})

