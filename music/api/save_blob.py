import base64
import datetime

from rest_framework.response import Response
from rest_framework.views import APIView


class SaveBlob(APIView):

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
        file_path = request.build_absolute_uri('/media/%s' % filename)
        return Response({'file_path': file_path, 'status': 'ok'})

