from django.conf import settings
from django.shortcuts import render

# Create your views here.

from django.http import HttpResponse
from django.template import loader


def index(request):
    template = loader.get_template('index.html')
    context = {
        'songs_list': settings.SONGS_LIST,
    }
    return HttpResponse(template.render(context, request))

